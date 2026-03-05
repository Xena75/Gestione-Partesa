-- =====================================================
-- MIGRATION: Aggiunta colonna anno a viaggi_pod
-- Data: 2026-03-04
-- Database: viaggi_db
-- =====================================================
-- Descrizione: anno = YEAR(`Data Inizio`) per filtro e performance query

USE viaggi_db;

-- Aggiungi colonna anno STORED GENERATED
-- Nota: COMMENT e NULL non supportati su colonne GENERATED in MariaDB
ALTER TABLE viaggi_pod
ADD COLUMN anno SMALLINT(6) GENERATED ALWAYS AS (YEAR(`Data Inizio`)) STORED;

-- Aggiungi indice per migliorare le performance delle query di filtro per anno
CREATE INDEX idx_anno ON viaggi_pod(anno);
