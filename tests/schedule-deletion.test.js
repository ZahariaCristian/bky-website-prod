const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDeletedScheduleIds } = require("../lib/scheduleDeletion");

test("normalizes explicit schedule deletion ids", () => {
    assert.deepEqual(normalizeDeletedScheduleIds(["7", 7, 12, "bad", 0, -1, null]), [7, 12]);
});

test("does not treat a non-array browser value as a deletion request", () => {
    assert.deepEqual(normalizeDeletedScheduleIds("7"), []);
    assert.deepEqual(normalizeDeletedScheduleIds(null), []);
});
