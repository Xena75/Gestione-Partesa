-- Eseguire su MySQL 8 (cloud) DOPO l'import del dump modificato
-- (dump con colonne GENERATED convertite in colonne normali per travels e viaggi_pod).
-- Ripristina le STORED GENERATED: i valori vengono ricalcolati dalle espressioni.

USE viaggi_db;

-- ========== travels ==========

ALTER TABLE `travels` DROP COLUMN `mese`;
ALTER TABLE `travels` DROP COLUMN `oreEffettive`;
ALTER TABLE `travels` DROP COLUMN `kmEffettivi`;
ALTER TABLE `travels` DROP COLUMN `data_viaggio`;

ALTER TABLE `travels`
  ADD COLUMN `data_viaggio` date GENERATED ALWAYS AS (cast(`dataOraInizioViaggio` as date)) STORED;

ALTER TABLE `travels`
  ADD COLUMN `kmEffettivi` int(11) GENERATED ALWAYS AS (
    case
      when `kmFinali` is not null and `kmIniziali` is not null then `kmFinali` - `kmIniziali`
      else NULL
    end
  ) STORED;

ALTER TABLE `travels`
  ADD COLUMN `oreEffettive` double GENERATED ALWAYS AS (
    case
      when `dataOraFineViaggio` is not null and `dataOraInizioViaggio` is not null
      then round(timestampdiff(MINUTE, `dataOraInizioViaggio`, `dataOraFineViaggio`) / 60.0, 2)
      else NULL
    end
  ) STORED;

ALTER TABLE `travels`
  ADD COLUMN `mese` tinyint(4) GENERATED ALWAYS AS (
    case when `data_viaggio` is not null then month(`data_viaggio`) else NULL end
  ) STORED;

-- ========== viaggi_pod ==========
-- Se hai GIÀ eseguito con successo il blocco travels sopra, seleziona ed esegui SOLO
-- da qui in giù (altrimenti i DROP su travels falliscono: colonne già GENERATED).
-- Ordine DROP: prima le colonne che dipendono da `Data`, poi le altre.

ALTER TABLE `viaggi_pod` DROP COLUMN `Trimestre`;
ALTER TABLE `viaggi_pod` DROP COLUMN `Sett`;
ALTER TABLE `viaggi_pod` DROP COLUMN `Giorno`;
ALTER TABLE `viaggi_pod` DROP COLUMN `Mese`;
ALTER TABLE `viaggi_pod` DROP COLUMN `Data`;
ALTER TABLE `viaggi_pod` DROP COLUMN `Ore_Pod`;
ALTER TABLE `viaggi_pod` DROP COLUMN `anno`;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `Ore_Pod` decimal(8,2) GENERATED ALWAYS AS (
    case
      when `Data Inizio` is null or `Data Fine` is null then NULL
      else round(timestampdiff(MINUTE, `Data Inizio`, `Data Fine`) / 60, 2)
    end
  ) STORED;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `Data` date GENERATED ALWAYS AS (cast(`Data Inizio` as date)) STORED;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `Mese` tinyint(4) GENERATED ALWAYS AS (month(`Data`)) STORED;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `Giorno` varchar(11) GENERATED ALWAYS AS (
    case weekday(`Data`)
      when 0 then 'Lunedì'
      when 1 then 'Martedì'
      when 2 then 'Mercoledì'
      when 3 then 'Giovedì'
      when 4 then 'Venerdì'
      when 5 then 'Sabato'
      when 6 then 'Domenica'
    end
  ) STORED;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `Sett` tinyint(4) GENERATED ALWAYS AS (week(`Data`, 3)) STORED;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `Trimestre` tinyint(4) GENERATED ALWAYS AS (quarter(`Data`)) STORED;

ALTER TABLE `viaggi_pod`
  ADD COLUMN `anno` smallint(6) GENERATED ALWAYS AS (year(`Data Inizio`)) STORED;
