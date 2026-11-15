-- Extra ibrido: link opzionale a viaggi_db.companies
-- (nessuna FK cross-database; company_id è riferimento logico)

ALTER TABLE extra_beneficiaries
  ADD COLUMN company_id INT NULL COMMENT 'link opzionale viaggi_db.companies.id' AFTER employee_id,
  ADD KEY idx_extra_beneficiaries_company (company_id),
  ADD KEY idx_extra_beneficiaries_employee (employee_id);
