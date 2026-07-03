INSERT INTO `tblPlatformPrices` (
    `group`,
    `platform`,
    `product`,
    `days`,
    `variantKey`,
    `optionsJson`,
    `price`,
    `standardPrice`,
    `active`,
    `createdAt`,
    `updatedAt`
)
SELECT
    `group`,
    'incontriamoci',
    `product`,
    `days`,
    CASE
        WHEN `product` = 'vetrina' THEN 'default'
        ELSE CONCAT(`timeSlot`, '-r', `risalite`)
    END,
    CASE
        WHEN `product` = 'vetrina' THEN '{}'
        ELSE JSON_OBJECT(
            'timeSlot', `timeSlot`,
            'risalite', `risalite`
        )
    END,
    `discountedPrice`,
    `standardPrice`,
    1,
    `createdAt`,
    `updatedAt`
FROM `tblIncontriamociPrices`
ON DUPLICATE KEY UPDATE
    `price` = VALUES(`price`),
    `standardPrice` = VALUES(`standardPrice`),
    `optionsJson` = VALUES(`optionsJson`),
    `active` = 1,
    `updatedAt` = VALUES(`updatedAt`);
