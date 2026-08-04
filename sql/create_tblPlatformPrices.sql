CREATE TABLE IF NOT EXISTS `tblPlatformPrices` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `group` INT NOT NULL,
    `platform` ENUM(
        'incontriamoci',
        'amasens',
        'moscarossa',
        'trovagnocca',
        'megaescort',
        'incontriescort',
        'bakeca',
        'bakecaincontrii'
    ) NOT NULL,
    `product` VARCHAR(50) NOT NULL,
    `days` INT NOT NULL,
    `variantKey` VARCHAR(100) NOT NULL DEFAULT 'default',
    `optionsJson` JSON NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `standardPrice` DECIMAL(10,2) NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL,
    `updatedAt` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `platform_price_combination` (
        `group`,
        `platform`,
        `product`,
        `days`,
        `variantKey`
    ),
    KEY `platform_price_lookup` (
        `group`,
        `platform`,
        `product`
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
