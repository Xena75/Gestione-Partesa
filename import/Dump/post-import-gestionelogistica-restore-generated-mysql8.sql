-- Eseguire su MySQL 8 (cloud) DOPO import di dump-gestionelogistica-*-mysql8.sql
-- Ripristina colonne STORED GENERATED e indici unici persi al DROP.

USE gestionelogistica;

-- ========== db_consegne ==========
ALTER TABLE `db_consegne` DROP COLUMN `ID_Consegna`;
ALTER TABLE `db_consegne`
  ADD COLUMN `ID_Consegna` varchar(100) GENERATED ALWAYS AS (concat(`Ordine`, '_', `Cod_Articolo`)) STORED;
ALTER TABLE `db_consegne` ADD UNIQUE KEY `idx_id_consegna` (`ID_Consegna`);

-- ========== fatt_delivery ==========
ALTER TABLE `fatt_delivery` DROP COLUMN `anno`;
ALTER TABLE `fatt_delivery` DROP COLUMN `settimana`;
ALTER TABLE `fatt_delivery` DROP COLUMN `mese`;
ALTER TABLE `fatt_delivery` DROP COLUMN `ID_fatt`;

ALTER TABLE `fatt_delivery`
  ADD COLUMN `ID_fatt` varchar(255) GENERATED ALWAYS AS (
    concat(ifnull(`div`, ''), '-', ifnull(`classe_tariffa`, ''), '-', ifnull(`classe_prod`, ''))
  ) STORED;

ALTER TABLE `fatt_delivery`
  ADD COLUMN `mese` tinyint(4) GENERATED ALWAYS AS (month(`data_mov_merce`)) STORED;

ALTER TABLE `fatt_delivery`
  ADD COLUMN `settimana` tinyint(4) GENERATED ALWAYS AS (week(`data_mov_merce`, 1)) STORED;

ALTER TABLE `fatt_delivery`
  ADD COLUMN `anno` smallint(6) GENERATED ALWAYS AS (year(`data_mov_merce`)) STORED;

-- ========== tab_delivery_terzisti ==========
ALTER TABLE `tab_delivery_terzisti` DROP COLUMN `tot_compenso`;
ALTER TABLE `tab_delivery_terzisti` DROP COLUMN `compenso`;
ALTER TABLE `tab_delivery_terzisti` DROP COLUMN `anno`;
ALTER TABLE `tab_delivery_terzisti` DROP COLUMN `trimestre`;
ALTER TABLE `tab_delivery_terzisti` DROP COLUMN `settimana`;
ALTER TABLE `tab_delivery_terzisti` DROP COLUMN `mese`;

ALTER TABLE `tab_delivery_terzisti`
  ADD COLUMN `compenso` decimal(10,2) GENERATED ALWAYS AS (`colli` * `tariffa_terzista`) STORED
  COMMENT 'Compenso calcolato: colli × tariffa_terzista';

ALTER TABLE `tab_delivery_terzisti`
  ADD COLUMN `tot_compenso` decimal(10,2) GENERATED ALWAYS AS (`compenso` + ifnull(`extra_cons`, 0)) STORED
  COMMENT 'Totale compenso: compenso + extra_cons';

ALTER TABLE `tab_delivery_terzisti`
  ADD COLUMN `mese` int(11) GENERATED ALWAYS AS (month(`data_viaggio`)) STORED;

ALTER TABLE `tab_delivery_terzisti`
  ADD COLUMN `trimestre` int(11) GENERATED ALWAYS AS (quarter(`data_viaggio`)) STORED;

ALTER TABLE `tab_delivery_terzisti`
  ADD COLUMN `settimana` int(11) GENERATED ALWAYS AS (week(`data_viaggio`, 1)) STORED;

ALTER TABLE `tab_delivery_terzisti`
  ADD COLUMN `anno` smallint(6) GENERATED ALWAYS AS (year(`data_viaggio`)) STORED;

-- ========== tab_viaggi ==========
-- Se il nome colonna prezzo al litro non fosse `€/lt`, adatta la riga euro_rifornimento
-- (controlla con: SHOW COLUMNS FROM tab_viaggi LIKE '%lt%';)

ALTER TABLE `tab_viaggi` DROP COLUMN `travelId`;
ALTER TABLE `tab_viaggi` DROP COLUMN `euro_rifornimento`;

ALTER TABLE `tab_viaggi`
  ADD COLUMN `euro_rifornimento` decimal(10,2) GENERATED ALWAYS AS (`Litri Riforniti` * `€/lt`) STORED;

ALTER TABLE `tab_viaggi`
  ADD COLUMN `travelId` varchar(191) GENERATED ALWAYS AS (concat('Viaggio - ', `Viaggio`)) STORED;
