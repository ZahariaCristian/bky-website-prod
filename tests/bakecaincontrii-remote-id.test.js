const test = require("node:test");
const assert = require("node:assert/strict");
const { extractBakecaincontriiRemoteId } = require("../lib/bakecaincontriiRemoteId");

test("extracts a Bakecaincontrii remote id only from a manage or update URL", () => {
    assert.equal(
        extractBakecaincontriiRemoteId("https://www.bakecaincontrii.com/u/post-manage/it31d82aa22a43dc8e56cdc36f52d087/"),
        "it31d82aa22a43dc8e56cdc36f52d087"
    );
    assert.equal(
        extractBakecaincontriiRemoteId("/u/post-update/itabc123/?next=/u/post-manage/itabc123/"),
        "itabc123"
    );
    assert.equal(extractBakecaincontriiRemoteId("https://como.bakecaincontrii.com/annuncio/test"), "");
});
