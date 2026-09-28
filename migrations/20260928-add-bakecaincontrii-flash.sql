-- Additive migration for the Bakecaincontrii Flash promotion.
-- Run once before deploying code that writes typeAnnuncio = 'Flash'.
ALTER TABLE `tblSchedulazioni`
    MODIFY COLUMN `typeAnnuncio` ENUM(
        'Free', 'Flash',
        '1x1', '1x3', '1x7', '1x14', '1x28',
        '3x1', '3x3', '3x7', '3x14', '3x28',
        '10x1', '10x3', '10x7',
        'Turbo', 'TopList', 'Vetrina',
        'Premium', 'Top', 'Red', 'Gold'
    ) NULL;
