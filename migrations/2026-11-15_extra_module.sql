-- Modulo Extra / cad-hoc / terzisti — gestionelogistica
-- Data: 2026-11-15
-- Additivo e ripetibile (IF NOT EXISTS). Non tocca Addebiti.

CREATE TABLE IF NOT EXISTS extra_import_batches (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  source_filename VARCHAR(255) NOT NULL,
  source_sha256 CHAR(64) NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_by VARCHAR(36) NULL,
  row_count INT NOT NULL DEFAULT 0,
  trip_count INT NOT NULL DEFAULT 0,
  compensation_count INT NOT NULL DEFAULT 0,
  beneficiary_count INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_extra_import_batches_imported_at (imported_at),
  CONSTRAINT fk_extra_import_batches_user
    FOREIGN KEY (imported_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS extra_beneficiaries (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(200) NOT NULL,
  kind ENUM('employee','company') NOT NULL,
  cdc VARCHAR(100) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  employee_id VARCHAR(36) NULL COMMENT 'Link opzionale a viaggi_db.employees.id (senza FK cross-db)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  version INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_extra_beneficiaries_name_kind (name, kind),
  KEY idx_extra_beneficiaries_kind_active (kind, active),
  KEY idx_extra_beneficiaries_cdc (cdc),
  CONSTRAINT fk_extra_beneficiaries_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_extra_beneficiaries_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS extra_trips (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  trip_number VARCHAR(100) NULL COMMENT 'Numero viaggio come testo (non UNIQUE)',
  order_ref VARCHAR(200) NULL COMMENT 'Ordine/DDT come testo',
  trip_date DATE NOT NULL,
  carrier_cod_vettore DOUBLE NULL COMMENT 'FK tab_vettori.Cod_Vettore',
  carrier_description VARCHAR(200) NULL COMMENT 'Copia descrizione Excel per storico',
  packages DECIMAL(12,2) NULL,
  service_notes TEXT NULL,
  is_extra TINYINT(1) NOT NULL DEFAULT 0,
  client_amount DECIMAL(12,2) NULL COMMENT 'NULL = mancante; 0 = zero esplicito',
  archived TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Incasso effettivo extra cliente',
  billing_notes TEXT NULL,
  import_batch_id CHAR(36) NULL,
  import_source_row INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  version INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_extra_trips_date (trip_date),
  KEY idx_extra_trips_trip_number (trip_number),
  KEY idx_extra_trips_archived_extra (archived, is_extra),
  KEY idx_extra_trips_carrier (carrier_cod_vettore),
  KEY idx_extra_trips_batch (import_batch_id),
  CONSTRAINT fk_extra_trips_carrier
    FOREIGN KEY (carrier_cod_vettore) REFERENCES tab_vettori(Cod_Vettore)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_extra_trips_batch
    FOREIGN KEY (import_batch_id) REFERENCES extra_import_batches(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_extra_trips_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_extra_trips_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS extra_compensations (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  trip_id CHAR(36) NOT NULL,
  cost_type ENUM('cad_hoc','terzista') NOT NULL,
  beneficiary_id CHAR(36) NULL,
  booklet_ref VARCHAR(100) NULL COMMENT 'Riferimento blocchetto, non quantità',
  vouchers_count INT NULL,
  voucher_unit_value DECIMAL(12,2) NULL COMMENT 'Valore buono applicato allo storico',
  terzista_amount DECIMAL(12,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  version INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_extra_compensations_trip (trip_id),
  KEY idx_extra_compensations_type (cost_type),
  KEY idx_extra_compensations_beneficiary (beneficiary_id),
  CONSTRAINT fk_extra_compensations_trip
    FOREIGN KEY (trip_id) REFERENCES extra_trips(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_extra_compensations_beneficiary
    FOREIGN KEY (beneficiary_id) REFERENCES extra_beneficiaries(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_extra_compensations_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_extra_compensations_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_extra_compensations_cad_hoc CHECK (
    cost_type <> 'cad_hoc'
    OR (
      (vouchers_count IS NULL OR vouchers_count >= 0)
      AND (voucher_unit_value IS NULL OR voucher_unit_value >= 0)
    )
  ),
  CONSTRAINT chk_extra_compensations_terzista CHECK (
    cost_type <> 'terzista'
    OR (terzista_amount IS NULL OR terzista_amount >= 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
