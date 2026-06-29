CREATE TABLE IF NOT EXISTS `tblIncontriamociPrices` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `group` INT NOT NULL,
    `product` ENUM('toplist', 'vetrina') NOT NULL,
    `days` INT NOT NULL,
    `timeSlot` VARCHAR(20) NOT NULL DEFAULT '',
    `risalite` INT NOT NULL DEFAULT 0,
    `discountedPrice` DECIMAL(10,2) NOT NULL,
    `standardPrice` DECIMAL(10,2) NOT NULL,
    `createdAt` DATETIME NOT NULL,
    `updatedAt` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `incontriamoci_price_combination` (
        `group`,
        `product`,
        `days`,
        `timeSlot`,
        `risalite`
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
