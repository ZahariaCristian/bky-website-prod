-- Stores the exact remote Moscarossa promotion expiration as UTC epoch milliseconds.
-- Run this migration before deploying the publisher and website changes.

ALTER TABLE `tblSchedulazioni`
    ADD COLUMN `remoteExpiresAt` BIGINT NULL AFTER `dateTimeTop`;
