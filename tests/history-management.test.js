const test = require("node:test");
const assert = require("node:assert/strict");
const { getAllowedHistoryStates } = require("../lib/historyManagement");

test("allows only valid Bakecaincontrii history state transitions", () => {
    assert.deepEqual(getAllowedHistoryStates("bakecaincontrii", "CLOSE"), ["OK"]);
    assert.deepEqual(getAllowedHistoryStates("bakecaincontrii", "REPUBLISH"), ["CLOSED"]);
    assert.deepEqual(getAllowedHistoryStates("bakecaincontrii", "DELETE"), ["OK", "CLOSED"]);
});

test("does not grant Bakecaincontrii the Moscarossa ALERT upgrade exception", () => {
    assert.deepEqual(
        getAllowedHistoryStates("bakecaincontrii", "REPUBLISH", { republishUpgrade: true }),
        ["CLOSED"]
    );
    assert.deepEqual(
        getAllowedHistoryStates("moscarossa", "REPUBLISH", { republishUpgrade: true }),
        ["CLOSED", "ALERT"]
    );
});
