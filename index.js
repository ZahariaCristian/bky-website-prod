const express = require("express");
const sessions = require('express-session');
const https = require("https");
const cookieParser = require("cookie-parser");
const jwt = require('jsonwebtoken');
const app = express();
const dotenv = require('dotenv');
const ctx = require("./ctx/model");
const salt = require("./lib/salt");
const logger = require("./lib/logger")
const fs = require("fs");
const path = require("path");
const geoip = require('geoip-lite');
const FileStore = require('session-file-store')(sessions);

dotenv.config();
process.env.TZ = process.env.TIMEZONE;

function generateAccessToken(username) {
    return jwt.sign(username, process.env.TOKEN_SECRET);
}

const annunciRoute = require("./routes/annunci.js");
const contactVerifyRoute = require("./routes/contactVerify.js");
const imagesRoute = require("./routes/images.js");
const logbotRoute = require("./routes/logbot.js");
const teamRoute = require("./routes/team.js");
const gestPagamentiRoute = require("./routes/gestPagamenti.js");
const newUserRoute = require("./routes/newuser.js");
const usersRoute = require("./routes/users.js");
const profileRoute = require("./routes/profile.js");
const userRoute = require("./routes/user.js");
const blackListRoute = require("./routes/blacklist.js");
const masterRoute = require("./routes/master.js");
const comunicaRoute = require("./routes/comunicazioni.js");
const addbookRoute = require("./routes/addbook.js");
const deadLineRoute = require("./routes/deadline.js");
const segnalazioniRoute = require("./routes/segnalazioni.js");

const { default: axios } = require("axios");

app.set("view engine", "ejs");
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.set('trust proxy', 1) // trust first proxy
function isWindowsSessionRenameError(err) {
    return err && err.code === "EPERM" && err.syscall === "rename" && String(err.path || "").includes(`${path.sep}sessions${path.sep}`);
}

function createSessionStore() {
    const store = new FileStore({
        path: path.join(__dirname, "sessions"),
        ttl: 60 * 60 * 24,  // time-to-live in seconds (default is 1 day)
        logFn: (message) => {
            if (process.env.SESSION_FILE_STORE_DEBUG === "1") {
                console.log(message);
            }
        },
    });

    const pendingWrites = new Map();
    const serializeWrite = (methodName) => {
        const original = store[methodName].bind(store);

        store[methodName] = (sessionId, ...args) => {
            const callback = typeof args[args.length - 1] === "function" ? args.pop() : null;
            const previous = pendingWrites.get(sessionId) || Promise.resolve();

            const next = previous.catch(() => null).then(() => new Promise((resolve) => {
                let attempts = 0;
                const run = () => {
                    original(sessionId, ...args, (err, ...results) => {
                        if (isWindowsSessionRenameError(err) && attempts < 5) {
                            attempts += 1;
                            setTimeout(run, 80 * attempts);
                            return;
                        }

                        if (callback) {
                            callback(err, ...results);
                        }
                        resolve();
                    });
                };

                run();
            })).finally(() => {
                if (pendingWrites.get(sessionId) === next) {
                    pendingWrites.delete(sessionId);
                }
            });

            pendingWrites.set(sessionId, next);
        };
    };

    serializeWrite("set");
    serializeWrite("touch");
    serializeWrite("destroy");

    return store;
}

const sessionStore = createSessionStore();

app.use(sessions({
                store: sessionStore,
                secret: '563338751698',
                resave: false,
                saveUninitialized: false,
                cookie: { maxAge: 60000 * 720 }
                }));

                const activeSessions = {}; // Track active sessions by user ID, with up to two sessions per user

                app.post("/login", async (req, res) => {
                    try {
                        await ctx.model.authenticate();
                    } catch (error) {
                        return res.json({ err: `Unable to connect to the database: ${error}` });
                    }
                
                    const { username, password } = req.body;
                    const userAgent = req.headers['user-agent'];
                    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    const browser = parseBrowser(userAgent);
                    const device = parseDevice(userAgent);
                    
                    ctx.tblUser.findAll({ where: { userName: username, GCRecord: null } })
                        .then(async (result) => {
                            if (result.length !== 0) {
                                const user = result[0];
                                if (user.isActive) {
                                    salt.ComparePassword(password, user.password, async (err, match) => {
                                        if (err) {
                                            await logLoginAttempt(user.OID, username, "failure", userAgent, browser, device, ip, `Compare error: ${err}`);
                                            return res.json({ err: `Compare error: ${err}` });
                                        }
                                        
                                        if (match) {
                                            // Initialize session array if not present
                                            if (!activeSessions[user.OID]) {
                                                activeSessions[user.OID] = [];
                                            }
                                            
                                            // Remove the oldest session if two active sessions already exist
                                            if (activeSessions[user.OID].length >= 2) {
                                                const oldestSession = activeSessions[user.OID].shift();
                                                oldestSession.destroy();
                                            }
                
                                            // Create new session
                                            req.session.userid = user.OID;
                                            req.session.token = generateAccessToken(username);
                                            activeSessions[user.OID].push(req.session);
                
                                            await logLoginAttempt(user.OID, username, "success", userAgent, browser, device, ip, "Login successful");
                                            return res.json({ firstTime: user.firstTime });
                                        } else {
                                            await logLoginAttempt(user.OID, username, "failure", userAgent, browser, device, ip, "Password mismatch");
                                            return res.json({ err: `Password non riconosciuta` });
                                        }
                                    });
                                } else {
                                    await logLoginAttempt(user.OID, username, "failure", userAgent, browser, device, ip, "User is banned");
                                    return res.json({ err: `L'utente risulta bandito.` });
                                }
                            } else {
                                await logLoginAttempt(null, username, "failure", userAgent, browser, device, ip, "User not found");
                                return res.json({ err: `Utente non presente` });
                            }
                        })
                        .catch(async (err) => {
                            console.error(err);
                            await logLoginAttempt(null, username, "failure", userAgent, browser, device, ip, `Database error: ${err}`);
                            return res.json({ err: `Unable to connect to the database: ${err}` });
                        });
                });
                
                function parseBrowser(userAgent) {
                    // Implement browser parsing logic here
                    return "parsedBrowserInfo"; // Replace with actual parsing logic
                }
                
                function parseDevice(userAgent) {
                    // Implement device parsing logic here
                    return "parsedDeviceInfo"; // Replace with actual parsing logic
                }
                
                async function logLoginAttempt(userId, username, status, userAgent, browser, device, ip, message) {
                    if (!ctx.tblLogs) {
                        console.error('tblLogs model is not defined in ctx');
                        return; // Exit if tblLogs is not available
                    }
                
                    // Get current timestamp with date and time
                    const timestamp = new Date(); // This will include the current date and time
                
                    try {
                        await ctx.tblLogs.create({
                            userId: userId,
                            username: username,
                            status: status,
                            userAgent: userAgent,
                            browser: browser,
                            device: device,
                            ipAddress: ip,
                            message: message,
                            timestamp: timestamp // Include the timestamp directly
                        });
                    } catch (error) {
                        console.error('Failed to log login attempt:', error);
                    }
                }

app.get("/logout", (req, res) =>{
    req.session.destroy();
    res.redirect("/");
});

app.get("/", (req, res) => {
    res.render("pages/index");
});
app.get("/listaAnnunci.html", (req, res) =>{
    res.render('pages/listaAnnunci');
});
app.get("/annuncio.html", (req, res) =>{
    const { panel } = req.query;

    switch (panel) {
        case "bakecaincontri":
            res.render('pages/annuncio');
            break;
        case "bakeca":
            res.render('pages/panels/bakeca');
            break;
        case "incontriamoci":
            res.render('pages/panels/incontriamoci');
            break;
        case "amasens":
            res.render('pages/panels/amasens');
            break;
        case "trovagnocca":
            res.render('pages/panels/trovagnocca');
            break;
        case "me":
        case "megaescort":
            res.render('pages/panels/me');
            break;
        case "incontri":
            res.render('pages/panels/incontri');
            break;
        default:
            res.render('pages/annuncio');
            break;
    }
});
app.get("/logbot.html", (req, res)=>{
    res.render('pages/logbot');
});
app.get("/team.html", (req, res)=>{
    res.render('pages/team');
});
app.get("/gestPagamenti.html", (req, res)=>{
    res.render('pages/gestPagamenti');
});
app.get("/newuser.html", (req, res)=>{
    res.render('pages/newuser');
});
app.get("/users.html", (req, res)=>{
    res.render('pages/users');
});
app.get("/profile.html", (req, res)=>{
    res.render('pages/profile');
});
app.get("/user.html", (req, res)=>{
    res.render('pages/user');
});
app.get("/blacklist.html", (req, res)=>{
    res.render('pages/blacklist');
});
app.get("/comunicazioni.html", (req, res)=>{
    res.render('pages/comunicazioni');
});
app.get("/addbook.html", (req, res)=>{
    res.render('pages/addbook');
});
app.get("/deadline.html", (req, res)=>{
    res.render('pages/deadline');
});
app.get("/segnalazioni.html", (req, res)=>{
    res.render('pages/segnalazioni');
});

app.use("/annuncio", annunciRoute);
app.use("/contactVerify", contactVerifyRoute);
app.use("/images", imagesRoute);
app.use("/logbot", logbotRoute);
app.use("/team", teamRoute);
app.use("/gestPagamenti", gestPagamentiRoute);
app.use("/newUser", newUserRoute);
app.use("/users", usersRoute);
app.use("/profile", profileRoute);
app.use("/user", userRoute);
app.use("/blackList", blackListRoute);
app.use("/master", masterRoute);
app.use("/comunicazioni", comunicaRoute);
app.use("/addbook", addbookRoute);
app.use("/deadline", deadLineRoute);
app.use("/segnalazioni", segnalazioniRoute);

app.use(express.static("public"));

app.all("*", (req, res) =>{
    res.status(404).sendFile("notfound.html", {root: __dirname + "/public"});
})

const PORT = 3001;

app.listen(PORT, () => console.log(`BKY in esecuzione su porta ${PORT}.`));
