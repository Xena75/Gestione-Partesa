import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import pool from '@/lib/db-gestione';

export type BeneficiaryKind = 'employee' | 'company';
export type CostType = 'cad_hoc' | 'terzista';

export interface ExtraBeneficiary {
  id: string;
  name: string;
  kind: BeneficiaryKind;
  cdc: string | null;
  active: number;
  employee_id: string | null;
  company_id: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

export interface ExtraCompensation {
  id: string;
  trip_id: string;
  cost_type: CostType;
  beneficiary_id: string | null;
  booklet_ref: string | null;
  vouchers_count: number | null;
  voucher_unit_value: number | null;
  terzista_amount: number | null;
  created_at?: string;
  updated_at?: string;
  version?: number;
  beneficiary_name?: string | null;
  beneficiary_kind?: BeneficiaryKind | null;
  beneficiary_employee_id?: string | null;
  beneficiary_company_id?: number | null;
}

export interface ExtraTrip {
  id: string;
  trip_number: string | null;
  order_ref: string | null;
  trip_date: string;
  carrier_cod_vettore: number | null;
  carrier_description: string | null;
  packages: number | null;
  service_notes: string | null;
  is_extra: number;
  client_amount: number | null;
  archived: number;
  billing_notes: string | null;
  import_batch_id: string | null;
  import_source_row: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  compensations?: ExtraCompensation[];
}

export interface ExtraTripFilters {
  dataDa?: string;
  dataA?: string;
  archived?: '0' | '1' | 'all';
  isExtra?: '0' | '1' | 'all';
  amountPresence?: 'missing' | 'zero' | 'present' | 'all';
  search?: string;
  carrierCod?: number;
  costType?: CostType | 'all';
  hasCadHoc?: '0' | '1' | 'all';
  beneficiaryId?: string;
  page?: number;
  pageSize?: number;
  sortBy?:
    | 'trip_date'
    | 'trip_number'
    | 'service_notes'
    | 'carrier_description'
    | 'billing_notes'
    | 'client_amount'
    | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CompensationInput {
  id?: string;
  cost_type: CostType;
  beneficiary_id?: string | null;
  /** Select da viaggi_db.employees → upsert extra_beneficiaries */
  source_employee_id?: string | null;
  /** Select da viaggi_db.companies → upsert extra_beneficiaries */
  source_company_id?: number | null;
  booklet_ref?: string | null;
  vouchers_count?: number | null;
  voucher_unit_value?: number | null;
  terzista_amount?: number | null;
}

export interface TripInput {
  trip_number?: string | null;
  order_ref?: string | null;
  trip_date: string;
  carrier_cod_vettore?: number | null;
  carrier_description?: string | null;
  packages?: number | null;
  service_notes?: string | null;
  is_extra?: boolean | number;
  client_amount?: number | null;
  archived?: boolean | number;
  billing_notes?: string | null;
  compensations?: CompensationInput[];
  version?: number;
}

function toBoolInt(v: boolean | number | string | undefined | null, fallback = 0): number {
  if (v === undefined || v === null) return fallback;
  return v === true || v === 1 || v === '1' ? 1 : 0;
}

function validateCompensation(c: CompensationInput): string | null {
  if (c.cost_type !== 'cad_hoc' && c.cost_type !== 'terzista') {
    return 'cost_type non valido';
  }
  if (c.cost_type === 'cad_hoc') {
    if (c.vouchers_count != null && c.vouchers_count < 0) return 'vouchers_count non valido';
    if (c.voucher_unit_value != null && Number(c.voucher_unit_value) < 0) {
      return 'voucher_unit_value non valido';
    }
  }
  if (c.cost_type === 'terzista' && c.terzista_amount != null && Number(c.terzista_amount) < 0) {
    return 'terzista_amount non valido';
  }
  return null;
}

async function assertBeneficiaryMatchesCost(
  beneficiaryId: string | null | undefined,
  costType: CostType
): Promise<string | null> {
  if (!beneficiaryId) return null;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT kind, active FROM extra_beneficiaries WHERE id = ? LIMIT 1',
    [beneficiaryId]
  );
  if (!rows.length) return 'Beneficiario non trovato';
  if (!rows[0].active) return 'Beneficiario non attivo';
  const kind = rows[0].kind as BeneficiaryKind;
  if (costType === 'cad_hoc' && kind !== 'employee') {
    return 'Per cad-hoc il beneficiario deve essere un dipendente';
  }
  if (costType === 'terzista' && kind !== 'company') {
    return 'Per terzista il beneficiario deve essere un\'azienda';
  }
  return null;
}

export async function listBeneficiaries(opts: {
  kind?: BeneficiaryKind | 'all';
  active?: '0' | '1' | 'all';
  search?: string;
}): Promise<ExtraBeneficiary[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.kind && opts.kind !== 'all') {
    where.push('kind = ?');
    params.push(opts.kind);
  }
  if (opts.active === '0' || opts.active === '1') {
    where.push('active = ?');
    params.push(Number(opts.active));
  }
  if (opts.search?.trim()) {
    where.push('(name LIKE ? OR IFNULL(cdc,\'\') LIKE ?)');
    const q = `%${opts.search.trim()}%`;
    params.push(q, q);
  }
  const sql = `
    SELECT * FROM extra_beneficiaries
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY kind ASC, name ASC
  `;
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as ExtraBeneficiary[];
}

export async function createBeneficiary(
  input: {
    name: string;
    kind: BeneficiaryKind;
    cdc?: string | null;
    employee_id?: string | null;
    company_id?: number | null;
    active?: boolean;
  },
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = String(input.name || '').trim();
  if (!name) return { ok: false, error: 'Nome obbligatorio' };
  if (input.kind !== 'employee' && input.kind !== 'company') {
    return { ok: false, error: 'kind non valido' };
  }
  const id = randomUUID();
  try {
    await pool.execute(
      `INSERT INTO extra_beneficiaries
        (id, name, kind, cdc, employee_id, company_id, active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        input.kind,
        input.cdc?.trim() || null,
        input.employee_id || null,
        input.company_id ?? null,
        toBoolInt(input.active, 1),
        userId,
        userId,
      ]
    );
    return { ok: true, id };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'ER_DUP_ENTRY') return { ok: false, error: 'Beneficiario già esistente' };
    throw e;
  }
}

/** Upsert beneficiario Extra da dipendente attivo in viaggi_db.employees */
export async function ensureBeneficiaryFromEmployee(
  employeeId: string,
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = String(employeeId || '').trim();
  if (!id) return { ok: false, error: 'Dipendente obbligatorio' };

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM extra_beneficiaries WHERE employee_id = ? AND kind = 'employee' LIMIT 1`,
    [id]
  );
  if (existing.length) return { ok: true, id: existing[0].id as string };

  const [emps] = await pool.query<RowDataPacket[]>(
    `SELECT id, nominativo, cdc, active FROM viaggi_db.employees WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!emps.length) return { ok: false, error: 'Dipendente non trovato' };
  if (!emps[0].active) return { ok: false, error: 'Dipendente non attivo' };

  const name = String(emps[0].nominativo || '').trim();
  if (!name) return { ok: false, error: 'Nominativo dipendente mancante' };

  const created = await createBeneficiary(
    {
      name,
      kind: 'employee',
      cdc: emps[0].cdc || null,
      employee_id: id,
      active: true,
    },
    userId
  );
  if (!created.ok) {
    // race: già creato con stesso name
    const [again] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM extra_beneficiaries WHERE employee_id = ? AND kind = 'employee' LIMIT 1`,
      [id]
    );
    if (again.length) return { ok: true, id: again[0].id as string };
    const [byName] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM extra_beneficiaries WHERE kind = 'employee' AND name = ? LIMIT 1`,
      [name]
    );
    if (byName.length) {
      await pool.execute(
        `UPDATE extra_beneficiaries SET employee_id = ?, cdc = COALESCE(?, cdc), updated_by = ?, version = version + 1 WHERE id = ?`,
        [id, emps[0].cdc || null, userId, byName[0].id]
      );
      return { ok: true, id: byName[0].id as string };
    }
    return created;
  }
  return created;
}

/** Upsert beneficiario Extra da viaggi_db.companies */
export async function ensureBeneficiaryFromCompany(
  companyId: number,
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cid = Number(companyId);
  if (!Number.isFinite(cid)) return { ok: false, error: 'Azienda obbligatoria' };

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM extra_beneficiaries WHERE company_id = ? AND kind = 'company' LIMIT 1`,
    [cid]
  );
  if (existing.length) return { ok: true, id: existing[0].id as string };

  const [cos] = await pool.query<RowDataPacket[]>(
    `SELECT id, name FROM viaggi_db.companies WHERE id = ? LIMIT 1`,
    [cid]
  );
  if (!cos.length) return { ok: false, error: 'Azienda non trovata' };
  const name = String(cos[0].name || '').trim();
  if (!name) return { ok: false, error: 'Nome azienda mancante' };

  const created = await createBeneficiary(
    {
      name,
      kind: 'company',
      company_id: cid,
      active: true,
    },
    userId
  );
  if (!created.ok) {
    const [again] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM extra_beneficiaries WHERE company_id = ? AND kind = 'company' LIMIT 1`,
      [cid]
    );
    if (again.length) return { ok: true, id: again[0].id as string };
    const [byName] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM extra_beneficiaries WHERE kind = 'company' AND name = ? LIMIT 1`,
      [name]
    );
    if (byName.length) {
      await pool.execute(
        `UPDATE extra_beneficiaries SET company_id = ?, updated_by = ?, version = version + 1 WHERE id = ?`,
        [cid, userId, byName[0].id]
      );
      return { ok: true, id: byName[0].id as string };
    }
    return created;
  }
  return created;
}

async function resolveCompensationBeneficiary(
  c: CompensationInput,
  userId: string
): Promise<{ ok: true; beneficiary_id: string | null } | { ok: false; error: string }> {
  if (c.cost_type === 'cad_hoc' && c.source_employee_id) {
    const ens = await ensureBeneficiaryFromEmployee(c.source_employee_id, userId);
    if (!ens.ok) return ens;
    return { ok: true, beneficiary_id: ens.id };
  }
  if (c.cost_type === 'terzista' && c.source_company_id != null && Number.isFinite(Number(c.source_company_id))) {
    const ens = await ensureBeneficiaryFromCompany(Number(c.source_company_id), userId);
    if (!ens.ok) return ens;
    return { ok: true, beneficiary_id: ens.id };
  }
  return { ok: true, beneficiary_id: c.beneficiary_id || null };
}

export async function updateBeneficiary(
  id: string,
  input: {
    name?: string;
    kind?: BeneficiaryKind;
    cdc?: string | null;
    employee_id?: string | null;
    company_id?: number | null;
    active?: boolean | number;
    version: number;
  },
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (input.version == null || !Number.isFinite(Number(input.version))) {
    return { ok: false, error: 'version obbligatoria', status: 400 };
  }

  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) return { ok: false, error: 'Nome obbligatorio', status: 400 };
    sets.push('name = ?');
    vals.push(name);
  }
  if (input.kind !== undefined) {
    if (input.kind !== 'employee' && input.kind !== 'company') {
      return { ok: false, error: 'kind non valido', status: 400 };
    }
    sets.push('kind = ?');
    vals.push(input.kind);
  }
  if (input.cdc !== undefined) {
    sets.push('cdc = ?');
    vals.push(input.cdc?.trim() || null);
  }
  if (input.employee_id !== undefined) {
    sets.push('employee_id = ?');
    vals.push(input.employee_id || null);
  }
  if (input.company_id !== undefined) {
    sets.push('company_id = ?');
    vals.push(input.company_id ?? null);
  }
  if (input.active !== undefined) {
    sets.push('active = ?');
    vals.push(toBoolInt(input.active));
  }
  if (!sets.length) return { ok: false, error: 'Nessun campo da aggiornare', status: 400 };

  sets.push('updated_by = ?', 'version = version + 1');
  vals.push(userId, Number(input.version), id);

  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE extra_beneficiaries SET ${sets.join(', ')} WHERE version = ? AND id = ?`,
    vals
  );
  if (res.affectedRows === 0) {
    const [exists] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM extra_beneficiaries WHERE id = ? LIMIT 1',
      [id]
    );
    if (!exists.length) return { ok: false, error: 'Beneficiario non trovato', status: 404 };
    return { ok: false, error: 'Conflitto di versione: dati aggiornati da un altro utente', status: 409 };
  }
  return { ok: true };
}

export async function getBeneficiary(id: string): Promise<ExtraBeneficiary | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM extra_beneficiaries WHERE id = ? LIMIT 1',
    [id]
  );
  return (rows[0] as ExtraBeneficiary) || null;
}

function buildTripWhere(filters: ExtraTripFilters): {
  where: string;
  params: (string | number)[];
} {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.dataDa) {
    where.push('t.trip_date >= ?');
    params.push(filters.dataDa);
  }
  if (filters.dataA) {
    where.push('t.trip_date <= ?');
    params.push(filters.dataA);
  }
  if (filters.archived === '0' || filters.archived === '1') {
    where.push('t.archived = ?');
    params.push(Number(filters.archived));
  }
  if (filters.isExtra === '0' || filters.isExtra === '1') {
    where.push('t.is_extra = ?');
    params.push(Number(filters.isExtra));
  }
  if (filters.amountPresence === 'missing') {
    where.push('t.client_amount IS NULL');
  } else if (filters.amountPresence === 'zero') {
    where.push('t.client_amount = 0');
  } else if (filters.amountPresence === 'present') {
    where.push('t.client_amount IS NOT NULL AND t.client_amount <> 0');
  }
  if (filters.carrierCod != null && Number.isFinite(filters.carrierCod)) {
    where.push('t.carrier_cod_vettore = ?');
    params.push(filters.carrierCod);
  }
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    where.push(
      `(IFNULL(t.trip_number,'') LIKE ? OR IFNULL(t.order_ref,'') LIKE ? OR IFNULL(t.carrier_description,'') LIKE ? OR IFNULL(t.service_notes,'') LIKE ? OR IFNULL(t.billing_notes,'') LIKE ?)`
    );
    params.push(q, q, q, q, q);
  }
  if (filters.costType === 'cad_hoc' || filters.costType === 'terzista') {
    where.push(
      `EXISTS (SELECT 1 FROM extra_compensations c WHERE c.trip_id = t.id AND c.cost_type = ?)`
    );
    params.push(filters.costType);
  }
  if (filters.hasCadHoc === '1') {
    where.push(
      `EXISTS (SELECT 1 FROM extra_compensations c WHERE c.trip_id = t.id AND c.cost_type = 'cad_hoc')`
    );
  } else if (filters.hasCadHoc === '0') {
    where.push(
      `NOT EXISTS (SELECT 1 FROM extra_compensations c WHERE c.trip_id = t.id AND c.cost_type = 'cad_hoc')`
    );
  }
  if (filters.beneficiaryId?.trim()) {
    where.push(
      `EXISTS (SELECT 1 FROM extra_compensations c WHERE c.trip_id = t.id AND c.beneficiary_id = ?)`
    );
    params.push(filters.beneficiaryId.trim());
  }

  return {
    where: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function listTrips(filters: ExtraTripFilters = {}): Promise<{
  rows: ExtraTrip[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(filters.pageSize) || 25));
  const offset = (page - 1) * pageSize;
  const allowedSort = [
    'trip_date',
    'trip_number',
    'service_notes',
    'carrier_description',
    'billing_notes',
    'client_amount',
    'updated_at',
  ] as const;
  const sortBy =
    filters.sortBy && (allowedSort as readonly string[]).includes(filters.sortBy)
      ? filters.sortBy
      : 'trip_date';
  const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const { where, params } = buildTripWhere(filters);

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM extra_trips t ${where}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*,
       (SELECT SUM(IFNULL(c.vouchers_count,0) * IFNULL(c.voucher_unit_value,0))
          FROM extra_compensations c
         WHERE c.trip_id = t.id AND c.cost_type = 'cad_hoc') AS cad_amount,
       (SELECT SUM(IFNULL(c.terzista_amount,0))
          FROM extra_compensations c
         WHERE c.trip_id = t.id AND c.cost_type = 'terzista') AS sub_amount,
       (SELECT GROUP_CONCAT(DISTINCT b.name ORDER BY b.name SEPARATOR ', ')
          FROM extra_compensations c
          LEFT JOIN extra_beneficiaries b ON b.id = c.beneficiary_id
         WHERE c.trip_id = t.id) AS payee_names
     FROM extra_trips t
     ${where}
     ORDER BY t.\`${sortBy}\` ${sortOrder}, t.id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  return { rows: rows as ExtraTrip[], total, page, pageSize };
}

export async function getCadHocByBeneficiary(filters: ExtraTripFilters = {}) {
  const { where, params } = buildTripWhere({
    dataDa: filters.dataDa,
    dataA: filters.dataA,
    archived: filters.archived,
  });
  const tripFilter = where ? where.replace(/^WHERE/, 'AND') : '';
  const benFilters: string[] = [];
  const benParams: (string | number)[] = [];
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    benFilters.push(`(IFNULL(b.name,'') LIKE ? OR IFNULL(b.cdc,'') LIKE ?)`);
    benParams.push(q, q);
  }
  if (filters.beneficiaryId?.trim()) {
    benFilters.push('b.id = ?');
    benParams.push(filters.beneficiaryId.trim());
  }
  const benFilterSql = benFilters.length ? `AND ${benFilters.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(b.name, 'Beneficiario da completare') AS beneficiary_name,
       COALESCE(b.id, '') AS beneficiary_id,
       SUM(IFNULL(c.vouchers_count, 0)) AS vouchers,
       SUM(IFNULL(c.vouchers_count, 0) * IFNULL(c.voucher_unit_value, 0)) AS amount,
       COUNT(DISTINCT t.id) AS trips
     FROM extra_compensations c
     INNER JOIN extra_trips t ON t.id = c.trip_id
     LEFT JOIN extra_beneficiaries b ON b.id = c.beneficiary_id
     WHERE c.cost_type = 'cad_hoc'
     ${tripFilter}
     ${benFilterSql}
     GROUP BY b.id, b.name
     ORDER BY beneficiary_name ASC`,
    [...params, ...benParams]
  );
  return rows;
}

export async function getTripSummary(filters: ExtraTripFilters = {}) {
  const { where, params } = buildTripWhere(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS totalTrips,
       SUM(CASE WHEN t.is_extra = 1 AND t.archived = 0 THEN 1 ELSE 0 END) AS openExtraCount,
       SUM(CASE WHEN t.is_extra = 1 AND t.archived = 0 THEN IFNULL(t.client_amount,0) ELSE 0 END) AS openExtraAmount,
       SUM(CASE WHEN t.is_extra = 1 AND t.archived = 1 THEN 1 ELSE 0 END) AS archivedExtraCount,
       SUM(CASE WHEN t.is_extra = 1 AND t.archived = 1 THEN IFNULL(t.client_amount,0) ELSE 0 END) AS archivedExtraAmount
     FROM extra_trips t
     ${where}`,
    params
  );

  const [comp] = await pool.query<RowDataPacket[]>(
    `SELECT
       SUM(CASE WHEN c.cost_type = 'cad_hoc' THEN 1 ELSE 0 END) AS cadCount,
       SUM(CASE WHEN c.cost_type = 'cad_hoc' THEN IFNULL(c.vouchers_count,0) * IFNULL(c.voucher_unit_value,0) ELSE 0 END) AS cadAmount,
       SUM(CASE WHEN c.cost_type = 'terzista' THEN 1 ELSE 0 END) AS subCount,
       SUM(CASE WHEN c.cost_type = 'terzista' THEN IFNULL(c.terzista_amount,0) ELSE 0 END) AS subAmount
     FROM extra_compensations c
     INNER JOIN extra_trips t ON t.id = c.trip_id
     ${where}`,
    params
  );

  return {
    ...(rows[0] || {}),
    ...(comp[0] || {}),
  };
}

export async function getTripById(id: string): Promise<ExtraTrip | null> {
  const [trips] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM extra_trips WHERE id = ? LIMIT 1',
    [id]
  );
  if (!trips.length) return null;
  const trip = trips[0] as ExtraTrip;
  const [comps] = await pool.query<RowDataPacket[]>(
    `SELECT c.*, b.name AS beneficiary_name, b.kind AS beneficiary_kind,
            b.employee_id AS beneficiary_employee_id, b.company_id AS beneficiary_company_id
     FROM extra_compensations c
     LEFT JOIN extra_beneficiaries b ON b.id = c.beneficiary_id
     WHERE c.trip_id = ?
     ORDER BY c.cost_type ASC, c.created_at ASC`,
    [id]
  );
  trip.compensations = comps as ExtraCompensation[];
  return trip;
}

async function replaceCompensations(
  conn: PoolConnection,
  tripId: string,
  compensations: CompensationInput[],
  userId: string
): Promise<string | null> {
  const resolved: CompensationInput[] = [];
  for (const c of compensations) {
    const err = validateCompensation(c);
    if (err) return err;
    const res = await resolveCompensationBeneficiary(c, userId);
    if (!res.ok) return res.error;
    const next = { ...c, beneficiary_id: res.beneficiary_id };
    const matchErr = await assertBeneficiaryMatchesCost(next.beneficiary_id, next.cost_type);
    if (matchErr) return matchErr;
    resolved.push(next);
  }

  await conn.execute('DELETE FROM extra_compensations WHERE trip_id = ?', [tripId]);
  for (const c of resolved) {
    const unit =
      c.cost_type === 'cad_hoc'
        ? c.voucher_unit_value != null
          ? Number(c.voucher_unit_value)
          : 10
        : null;
    await conn.execute(
      `INSERT INTO extra_compensations
        (id, trip_id, cost_type, beneficiary_id, booklet_ref, vouchers_count, voucher_unit_value, terzista_amount, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        tripId,
        c.cost_type,
        c.beneficiary_id || null,
        c.booklet_ref?.trim() || null,
        c.cost_type === 'cad_hoc' ? c.vouchers_count ?? null : null,
        unit,
        c.cost_type === 'terzista' ? c.terzista_amount ?? null : null,
        userId,
        userId,
      ]
    );
  }
  return null;
}

export async function createTrip(
  input: TripInput,
  userId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.trip_date) return { ok: false, error: 'trip_date obbligatoria' };
  const compensations = input.compensations || [];

  const tripId = randomUUID();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO extra_trips
        (id, trip_number, order_ref, trip_date, carrier_cod_vettore, carrier_description,
         packages, service_notes, is_extra, client_amount, archived, billing_notes,
         created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tripId,
        input.trip_number?.trim() || null,
        input.order_ref?.trim() || null,
        input.trip_date,
        input.carrier_cod_vettore ?? null,
        input.carrier_description?.trim() || null,
        input.packages ?? null,
        input.service_notes ?? null,
        toBoolInt(input.is_extra, 0),
        input.client_amount === undefined ? null : input.client_amount,
        toBoolInt(input.archived, 0),
        input.billing_notes ?? null,
        userId,
        userId,
      ]
    );

    const compErr = await replaceCompensations(conn, tripId, compensations, userId);
    if (compErr) {
      await conn.rollback();
      return { ok: false, error: compErr };
    }

    await conn.commit();
    return { ok: true, id: tripId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function updateTrip(
  id: string,
  input: TripInput,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status?: number; current?: ExtraTrip | null }> {
  if (input.version == null || !Number.isFinite(Number(input.version))) {
    return { ok: false, error: 'version obbligatoria', status: 400 };
  }
  if (!input.trip_date) return { ok: false, error: 'trip_date obbligatoria', status: 400 };

  const compensations = input.compensations || [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [upd] = await conn.execute<ResultSetHeader>(
      `UPDATE extra_trips SET
         trip_number = ?, order_ref = ?, trip_date = ?, carrier_cod_vettore = ?,
         carrier_description = ?, packages = ?, service_notes = ?, is_extra = ?,
         client_amount = ?, archived = ?, billing_notes = ?,
         updated_by = ?, version = version + 1
       WHERE id = ? AND version = ?`,
      [
        input.trip_number?.trim() || null,
        input.order_ref?.trim() || null,
        input.trip_date,
        input.carrier_cod_vettore ?? null,
        input.carrier_description?.trim() || null,
        input.packages ?? null,
        input.service_notes ?? null,
        toBoolInt(input.is_extra, 0),
        input.client_amount === undefined ? null : input.client_amount,
        toBoolInt(input.archived, 0),
        input.billing_notes ?? null,
        userId,
        id,
        Number(input.version),
      ]
    );

    if (upd.affectedRows === 0) {
      await conn.rollback();
      const current = await getTripById(id);
      if (!current) return { ok: false, error: 'Viaggio non trovato', status: 404 };
      return {
        ok: false,
        error: 'Conflitto di versione: dati aggiornati da un altro utente',
        status: 409,
        current,
      };
    }

    const compErr = await replaceCompensations(conn, id, compensations, userId);
    if (compErr) {
      await conn.rollback();
      return { ok: false, error: compErr, status: 400 };
    }

    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function setTripArchived(
  id: string,
  archived: boolean,
  version: number,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status?: number; current?: ExtraTrip | null }> {
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE extra_trips
     SET archived = ?, updated_by = ?, version = version + 1
     WHERE id = ? AND version = ?`,
    [archived ? 1 : 0, userId, id, version]
  );
  if (res.affectedRows === 0) {
    const current = await getTripById(id);
    if (!current) return { ok: false, error: 'Viaggio non trovato', status: 404 };
    return {
      ok: false,
      error: 'Conflitto di versione: dati aggiornati da un altro utente',
      status: 409,
      current,
    };
  }
  return { ok: true };
}

export async function deleteTrip(
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const [res] = await pool.execute<ResultSetHeader>(
    'DELETE FROM extra_trips WHERE id = ?',
    [id]
  );
  if (res.affectedRows === 0) {
    return { ok: false, error: 'Viaggio non trovato', status: 404 };
  }
  return { ok: true };
}
