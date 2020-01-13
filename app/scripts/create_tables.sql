CREATE TABLE IF NOT EXISTS USER (
    `userID` bigint(20) AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS FILE (
    `fileID` bigint(20) AUTO_INCREMENT PRIMARY KEY,
    `userID` bigint(20) NOT NULL,
    FOREIGN KEY fk_user(`userID`) REFERENCES USER(`userID`),
    `name` VARCHAR(100) NOT NULL,
    `path` VARCHAR(100) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `size` INT NOT NULL,
    `upload_date` DATETIME NOT NULL
);
