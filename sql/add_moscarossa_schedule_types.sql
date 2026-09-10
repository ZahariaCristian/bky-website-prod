-- Run this migration before deploying code that writes Moscarossa paid plans.
-- The ENUM remains shared with the existing platforms, so every prior value is
-- preserved while the four Moscarossa promotion names are added.

ALTER TABLE `tblSchedulazioni`
    MODIFY COLUMN `typeAnnuncio` ENUM(
        'Free',
        '1x1', '1x3', '1x7', '1x14', '1x28',
        '3x1', '3x3', '3x7', '3x14', '3x28',
        '10x1', '10x3', '10x7',
        'Turbo', 'TopList', 'Vetrina',
        'Premium', 'Top', 'Red', 'Gold'
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '1x1';

-- Backfill legacy Moscarossa schedules. Those rows stored typeAnnuncio='Free'
-- and put the real paid plan in period.moscarossa.plan.
UPDATE `tblSchedulazioni`
SET `typeAnnuncio` = CASE LOWER(JSON_UNQUOTE(JSON_EXTRACT(
        IF(JSON_VALID(`period`), `period`, '{}'),
        '$.moscarossa.plan'
    )))
        WHEN 'premium' THEN 'Premium'
        WHEN 'top' THEN 'Top'
        WHEN 'red' THEN 'Red'
        WHEN 'gold' THEN 'Gold'
        ELSE `typeAnnuncio`
    END
WHERE LOWER(COALESCE(`platform`, '')) = 'moscarossa'
  AND `typeAnnuncio` = 'Free';
