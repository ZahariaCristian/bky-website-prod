-- Run this migration before deploying the Moscarossa application code.
-- It preserves all current platform values and adds Moscarossa to every
-- shared platform discriminator used by BKY.

ALTER TABLE `tblPlatform`
    MODIFY COLUMN `platform` ENUM(
        'incontriamoci',
        'amasens',
        'moscarossa',
        'trovagnocca',
        'megaescort',
        'incontriescort',
        'bakeca',
        'bakecaincontrii'
    ) NOT NULL DEFAULT 'bakeca';

ALTER TABLE `tblSchedulazioni`
    MODIFY COLUMN `platform` ENUM(
        'incontriamoci',
        'amasens',
        'moscarossa',
        'trovagnocca',
        'megaescort',
        'incontriescort',
        'bakeca',
        'bakecaincontrii'
    ) NOT NULL DEFAULT 'bakecaincontrii';

ALTER TABLE `tblPlatformPrices`
    MODIFY COLUMN `platform` ENUM(
        'incontriamoci',
        'amasens',
        'moscarossa',
        'trovagnocca',
        'megaescort',
        'incontriescort',
        'bakeca',
        'bakecaincontrii'
    ) NOT NULL;
