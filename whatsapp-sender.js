const qrcode = require('qrcode-terminal');
const qrcode2 = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { DateTime } = require('luxon');
require('dotenv').config();

const dbConfig = {
    host: process.env.HOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    port: process.env.PORTDB,
    database: process.env.DATABASE,
};

const AUTH_DATA_PATH = process.env.WWEBJS_DATA_PATH || './.wwebjs_auth';

const clients = {}; // username -> client
const processingExpiredTodayForUser = {}; // username -> boolean
const lastProcessedForUser = {}; // username -> timestamp
const initializingClients = {}; // username -> boolean
const initRetryCount = {}; // username -> number
const INIT_RETRY_BASE_MS = 3000;
const INIT_RETRY_MAX_MS = 30000;
const APP_TIMEZONE = process.env.WHATSAPP_TIMEZONE || 'Europe/Rome';

function getCurrentDayWindow() {
    const now = DateTime.now().setZone(APP_TIMEZONE);
    return {
        nowUnix: now.toMillis(),
        startOfDayUnix: now.startOf('day').toMillis(),
        endOfDayUnix: now.endOf('day').toMillis(),
        todayLabel: now.toFormat('yyyy-LL-dd')
    };
}

function getUserDataDir(username) {
    const sessionDirName = username ? `session-${username}` : 'session';
    return path.resolve(AUTH_DATA_PATH, sessionDirName);
}

function isUserDataDirInUse(userDataDir) {
    return new Promise((resolve) => {
        execFile('pgrep', ['-f', `--user-data-dir=${userDataDir}`], (err, stdout) => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(stdout.trim().length > 0);
        });
    });
}

function scheduleInitRetry(username, client, message, withCleanup = true) {
    const attempt = (initRetryCount[username] || 0) + 1;
    initRetryCount[username] = attempt;
    const delayMs = Math.min(INIT_RETRY_MAX_MS, INIT_RETRY_BASE_MS * Math.pow(2, attempt - 1));
    console.warn(`[${username}] ${message} Retrying in ${delayMs}ms (attempt ${attempt})`);

    setTimeout(async () => {
        if (withCleanup) {
            try {
                await client.destroy();
            } catch (destroyErr) {
                console.warn(`[${username}] Error during client cleanup:`, destroyErr);
            }
        }
        initializeClient(username, client);
    }, delayMs);
}

async function initializeClient(username, client) {
    if (initializingClients[username]) {
        console.log(`[${username}] Client initialization already in progress`);
        return;
    }

    initializingClients[username] = true;
    try {
        const userDataDir = getUserDataDir(username);
        const inUse = await isUserDataDirInUse(userDataDir);
        if (inUse) {
            scheduleInitRetry(
                username,
                client,
                `Chrome profile in use at ${userDataDir}. Stop the other process or wait for it to exit.`,
                false
            );
            return;
        }

        await client.initialize();
        initRetryCount[username] = 0;
    } catch (err) {
        const message = err && err.message ? err.message : String(err);
        console.error(`[${username}] WhatsApp initialization failed:`, err);

        if (message.includes('already running')) {
            const userDataDir = getUserDataDir(username);
            scheduleInitRetry(
                username,
                client,
                `Chrome profile already running at ${userDataDir}. Stop the other process or wait for it to exit.`,
                false
            );
            return;
        }

        const shouldRetry = message.includes('Execution context was destroyed')
            || message.includes('Target closed')
            || message.includes('Navigation');

        if (shouldRetry) {
            scheduleInitRetry(username, client, 'Transient initialization error.');
        }
    } finally {
        initializingClients[username] = false;
    }
}

// --- WhatsApp client setup for each user ---
async function setupClients() {
    const connection = await mysql.createConnection(dbConfig);
    const [users] = await connection.execute('SELECT userName FROM tblUser WHERE isActive = 1');
    await connection.end();

    for (const user of users) {
        const username = user.userName;
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: username, dataPath: AUTH_DATA_PATH }),
            puppeteer: { headless: true, args: ['--no-sandbox', '--disable-gpu'] }
        });

        client.on('qr', async (qr) => {
            try {
                console.log(`[${username}] Scan of the QR is necessary!`);
                const conn = await mysql.createConnection(dbConfig);
                await conn.execute(
                    'UPDATE tblUser SET whatsapp_qr = ?, whatsapp_active = 0 WHERE userName = ?',
                    [qr, username]
                );
                await conn.end();
                console.log(`[${username}] QR code saved to DB and whatsapp_active set to 0`);
            } catch (err) {
                console.error(`[${username}] Error generating or saving QR code:`, err);
            }
        });

        client.on('ready', async () => {
            const conn = await mysql.createConnection(dbConfig);
            await conn.execute(
                'UPDATE tblUser SET whatsapp_active = 1 WHERE userName = ?',
                [username]
            );
            await conn.end();
            console.log(`[${username}] WhatsApp client ready`);
            startProcessingForUser(username); // Start processing for this user
        });

        client.on('disconnected', async () => {
            const conn = await mysql.createConnection(dbConfig);
            await conn.execute(
                'UPDATE tblUser SET whatsapp_active = 0 WHERE userName = ?',
                [username]
            );
            await conn.end();
            console.log(`[${username}] WhatsApp client disconnected`);
        });

        client.on('error', (err) => {
            if (err.message && err.message.includes("Failed to add page binding with name onQRChangedEvent")) {
                console.warn(`[${username}] Duplicate QR binding error ignored.`);
                return;
            }
            console.error(`[${username}] WhatsApp client error:`, err);
        });

        initializeClient(username, client);
        clients[username] = client;
    }
}
setupClients();

// --- Helper functions ---
function delay() {
    const ms = 2000 + Math.floor(Math.random() * 3000);
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMessageFromUser(username, phoneNumber, message) {
    const client = clients[username];
    if (!client) {
        console.error(`[${username}] No WhatsApp client`);
        return false;
    }
    
    if (!client.info) {
        console.error(`[${username}] Client not ready yet`);
        return false;
    }

    // Clean and format phone number
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
        console.error(`[${username}] Invalid phone number length: ${cleanNumber}`);
        return false;
    }

    // Handle Italian numbers (assuming local numbers start with 3)
    let formattedPhoneNumber;
    if (cleanNumber.startsWith('3') && cleanNumber.length === 10) {
        formattedPhoneNumber = `39${cleanNumber}`;
    } else if (cleanNumber.startsWith('39') && cleanNumber.length === 11) {
        formattedPhoneNumber = cleanNumber;
    } else {
        console.error(`[${username}] Unsupported phone number format: ${cleanNumber}`);
        return false;
    }

    const numberId = await client.getNumberId(formattedPhoneNumber);
    if (!numberId) {
        console.error(`[${username}] Phone number not registered on WhatsApp: ${formattedPhoneNumber}`);
        return false;
    }

    const chatId = numberId._serialized || `${formattedPhoneNumber}@c.us`;
    
    try {
        console.log(`[${username}] Attempting to send to ${chatId}`);
        const sentMsg = await client.sendMessage(chatId, message, { sendSeen: false });
        if (!sentMsg) {
            console.error(`[${username}] Failed to send to ${chatId}: no message returned`);
            return false;
        }
        console.log(`[${username}] Message sent to: ${chatId}`);
        return true;
    } catch (err) {
        console.error(`[${username}] Error sending message to ${chatId}:`, err);
        
        // Handle specific WhatsApp Web errors
        if (err.message.includes('not registered')) {
            console.error(`[${username}] Phone number not registered on WhatsApp: ${chatId}`);
        } else if (err.message.includes('timed out')) {
            console.error(`[${username}] Sending timed out for ${chatId}`);
        }
        
        return false;
    }
}

async function markSchedulazioneNotified(schedulazioneId) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE tblSchedulazioni SET notified = 1 WHERE id = ?',
            [schedulazioneId]
        );
        console.log(`Marked schedulazione ${schedulazioneId} as notified.`);
    } catch (err) {
        console.error(`Error updating notified status for schedulazione ${schedulazioneId}:`, err);
    } finally {
        if (connection) await connection.end();
    }
}

async function incrementMessaggiInviati(username) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            'UPDATE whatsapp SET inviati = inviati + 1 WHERE username = ?',
            [username]
        );
        if (result.affectedRows === 0) {
            await connection.execute(
                'INSERT INTO whatsapp (username, inviati, active) VALUES (?, 1, 1)',
                [username]
            );
            console.log(`[${username}] Inserted new whatsapp row and set inviati = 1`);
        } else {
            console.log(`[${username}] Incremented 'inviati'`);
        }
    } catch (err) {
        console.error(`[${username}] Error incrementing 'inviati':`, err);
    } finally {
        if (connection) await connection.end();
    }
}

async function logWhatsappMessage({ username, phone, schedulazione_id, message }) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO whatsapp_logs (username, phone, schedulazione_id, message) VALUES (?, ?, ?, ?)',
            [username, phone, schedulazione_id, message]
        );
        console.log(`[${username}] Logged WhatsApp message for phone: ${phone}, schedulazione_id: ${schedulazione_id}`);
    } catch (err) {
        console.error(`[${username}] Error logging WhatsApp message:`, err);
    } finally {
        if (connection) await connection.end();
    }
}

// Get schedulazioni that expire today for a specific user
async function getSchedulazioniToSend(username) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const { nowUnix, startOfDayUnix, endOfDayUnix, todayLabel } = getCurrentDayWindow();
        const [rows] = await connection.execute(`
            SELECT 
                s.id AS schedulazione_id,
                s.data,
                s.typeAnnuncio,
                s.annuncio,
                s.expiresAt,
                s.notifyEnabled,
                s.notified,
                a.id AS annuncio_id,
                a.title,
                d.phone AS phone_number,
                d.name AS donna_name,
                u.userName AS user_username,
                mw.username AS mw_username,
                mw.message AS custom_message
            FROM tblSchedulazioni s
            JOIN tblAnnunci a ON a.id = s.annuncio
            JOIN tblDonne d ON d.id = a.donna
            LEFT JOIN tblUser u ON u.OID = s.editedBy
            LEFT JOIN whatsapp mw ON mw.username COLLATE utf8mb4_general_ci = u.userName COLLATE utf8mb4_general_ci
            WHERE s.GCRecord IS NULL 
                AND a.GCRecord IS NULL 
                AND d.phone IS NOT NULL 
                AND s.notified = 0 
                AND s.notifyEnabled = 1
                AND u.userName = ? 
                AND s.expiresAt >= ?
                AND s.expiresAt <= ?
                AND (mw.active = 1 OR mw.active IS NULL)
            ORDER BY s.data DESC
            LIMIT 5000
        `, [username, startOfDayUnix, endOfDayUnix]);

        const toSend = [];
        for (const s of rows) {
            const expiresAt = parseInt(s.expiresAt, 10);
            if (!expiresAt || isNaN(expiresAt)) {
                console.log(`[${username}] Skipping schedulazione ${s.schedulazione_id}: invalid expiresAt`);
                continue;
            }
            if (nowUnix >= expiresAt) {
                toSend.push({
                    ...s,
                    expiresAt
                });
            } else {
                console.log(`[${username}] Skipping schedulazione ${s.schedulazione_id}: not yet expired (expiresAt: ${expiresAt}, now: ${nowUnix})`);
            }
        }
        console.log(
            `[${username}] Schedulazioni filtered for today only (${todayLabel}, ${APP_TIMEZONE}). Eligible rows: ${rows.length}`
        );
        return toSend;
    } catch (err) {
        console.error(`[${username}] Error fetching schedulazioni to send:`, err);
        return [];
    } finally {
        if (connection) await connection.end();
    }
}

// --- Get annunci that are expired and need notification ---
async function getAnnunciToSend(username) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const { nowUnix, startOfDayUnix, endOfDayUnix, todayLabel } = getCurrentDayWindow();
        const [rows] = await connection.execute(`
            SELECT 
                a.id AS annuncio_id,
                a.title,
                a.expiresAt,
                a.notifyEnabled,
                a.notified,
                a.donna,
                d.phone AS phone_number,
                d.name AS donna_name,
                u.userName AS user_username,
                mw.username AS mw_username,
                mw.message AS custom_message
            FROM tblAnnunci a
            JOIN tblDonne d ON d.id = a.donna
            LEFT JOIN tblUser u ON u.OID = a.editedBy
            LEFT JOIN whatsapp mw ON mw.username COLLATE utf8mb4_general_ci = u.userName COLLATE utf8mb4_general_ci
            WHERE a.GCRecord IS NULL 
                AND d.phone IS NOT NULL 
                AND a.notified = 0 
                AND a.notifyEnabled = 1
                AND u.userName = ? 
                AND a.expiresAt >= ?
                AND a.expiresAt <= ?
                AND (mw.active = 1 OR mw.active IS NULL)
            ORDER BY a.expiresAt DESC
        `, [username, startOfDayUnix, endOfDayUnix]);

        const toSend = [];
        for (const a of rows) {
            const expiresAt = parseInt(a.expiresAt, 10);
            if (!expiresAt || isNaN(expiresAt)) {
                console.log(`[${username}] Skipping annuncio ${a.annuncio_id}: invalid expiresAt`);
                continue;
            }
            if (nowUnix >= expiresAt) {

                toSend.push({
                    ...a,
                    expiresAt
                });
            } else {
                console.log(`[${username}] Skipping annuncio ${a.annuncio_id}: not yet expired today (expiresAt: ${expiresAt}, now: ${nowUnix})`);
            }
        }
        console.log(
            `[${username}] Annunci filtered for today only (${todayLabel}, ${APP_TIMEZONE}). Eligible rows: ${rows.length}`
        );
        return toSend;
    } catch (err) {
        console.error(`[${username}] Error fetching annunci to send:`, err);
        return [];
    } finally {
        if (connection) await connection.end();
    }
}

// --- Mark annuncio as notified ---
async function markAnnuncioNotified(annuncioId) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE tblAnnunci SET notified = 1 WHERE id = ?',
            [annuncioId]
        );
        console.log(`Marked annuncio ${annuncioId} as notified.`);
    } catch (err) {
        console.error(`Error updating notified status for annuncio ${annuncioId}:`, err);
    } finally {
        if (connection) await connection.end();
    }
}

// --- Main processing logic ---
async function processExpiredTodayForUser(username) {
    if (processingExpiredTodayForUser[username]) {
        console.log(`[${username}] Processing already in progress. Skipping.`);
        return;
    }
    processingExpiredTodayForUser[username] = true;

    try {
        const toSend = await getAnnunciToSend(username);
        console.log(`[${username}] Found ${toSend.length} annunci to send.`);

        for (const annuncio of toSend) {
            const expirationDate = new Date(annuncio.expiresAt).toLocaleString('it-IT');
            const baseMessage = annuncio.custom_message || 
                "L'ultimo dei tuoi annunci scadrà oggi su Bakecaincontrii! Contatta il tuo manager personale per nuovi annunci!";
            const message = `${baseMessage}`;

            console.log(`[${username}] PREPARING TO SEND:
    Phone: ${annuncio.phone_number}
    Annuncio ID: ${annuncio.annuncio_id}
    Expiration: ${expirationDate}
    Message: ${message}`);

            const success = await sendMessageFromUser(
                username,
                annuncio.phone_number,
                message
            );

            if (success) {
                console.log(`[${username}] SUCCESS: Message sent to ${annuncio.phone_number}`);
                await markAnnuncioNotified(annuncio.annuncio_id);
                await logWhatsappMessage({
                    username: annuncio.user_username,
                    phone: annuncio.phone_number,
                    schedulazione_id: annuncio.annuncio_id,
                    message: message
                });

                if (annuncio.user_username) {
                    await incrementMessaggiInviati(annuncio.user_username);
                }
            } else {
                console.error(`[${username}] FAILED to send to ${annuncio.phone_number}`);
            }

            await delay();
        }
    } catch (err) {
        console.error(`[${username}] ERROR during processing:`, err);
    } finally {
        processingExpiredTodayForUser[username] = false;
        console.log(`===== [${username}] PROCESSING COMPLETE =====\n`);
    }
}

// Start processing for a user
function startProcessingForUser(username) {
    console.log(`[${username}] Starting scheduler for user...`);
    setInterval(async () => {
        await processExpiredTodayForUser(username);
    }, 60000); // Check every 10 seconds
}
