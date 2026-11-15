import { createHash, randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import * as XLSX from 'xlsx';
import pool from '@/lib/db-gestione';

const DEFAULT_VOUCHER_VALUE = 10;

export interface ImportIssue {
  level: 'error' | 'warning' | 'info';
  sheet?: string;
  row?: number;
  code: string;
  message: string;
}

export interface ExtraImportReport {
  dryRun: boolean;
  sourceFilename: string;
  sourceSha256: string;
  batchId: string | null;
  skippedDuplicateBatch: boolean;
  counts: {
    anagraficaPeople: number;
    anagraficaCompanies: number;
    beneficiariesCreated: number;
    beneficiariesReused: number;
    tripsRead: number;
    tripsImported: number;
    tripsSkipped: number;
    compensationsCad: number;
    compensationsTerzista: number;
    carriersMatched: number;
    carriersUnmatched: number;
  };
  issues: ImportIssue[];
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function isTrue(v: unknown): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? '')
    .trim()
    .toUpperCase()
    .replace('Ì', 'I');
  return s === 'TRUE' || s === 'SI' || s === 'SÌ' || s === '1' || s === 'VERO';
}

function parseEuro(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  let s = String(v).replace(/€/gi, '').trim();
  if (!s) return null;
  // 1.225,00 or 1225.00 or 1,225.00
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  s = s.replace(/\s/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const s = String(v).trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // M/D/YY or M/D/YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const month = Number(m[1]);
    const day = Number(m[2]);
    // Excel IT export earlier showed 9/8/25 as Sep - US style in file
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

function cell(row: unknown[], idx: number): unknown {
  return row?.[idx] ?? null;
}

function text(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function findBatchByHash(hash: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM extra_import_batches WHERE source_sha256 = ? ORDER BY imported_at DESC LIMIT 1',
    [hash]
  );
  return rows[0]?.id ? String(rows[0].id) : null;
}

async function loadCarrierMap(conn: PoolConnection): Promise<Map<string, number>> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT Cod_Vettore, Descr_Vettore FROM tab_vettori WHERE Descr_Vettore IS NOT NULL'
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(String(r.Descr_Vettore).trim().toUpperCase(), Number(r.Cod_Vettore));
  }
  return map;
}

async function upsertBeneficiary(
  conn: PoolConnection,
  name: string,
  kind: 'employee' | 'company',
  cdc: string | null,
  userId: string | null,
  cache: Map<string, string>,
  report: ExtraImportReport
): Promise<string> {
  const key = `${kind}::${name.toUpperCase()}`;
  if (cache.has(key)) {
    report.counts.beneficiariesReused++;
    return cache.get(key)!;
  }

  const [existing] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM extra_beneficiaries WHERE name = ? AND kind = ? LIMIT 1',
    [name, kind]
  );
  if (existing[0]?.id) {
    const id = String(existing[0].id);
    cache.set(key, id);
    report.counts.beneficiariesReused++;
    return id;
  }

  const id = randomUUID();
  await conn.execute(
    `INSERT INTO extra_beneficiaries (id, name, kind, cdc, active, created_by, updated_by)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [id, name, kind, cdc, userId, userId]
  );
  cache.set(key, id);
  report.counts.beneficiariesCreated++;
  return id;
}

export async function importExtraExcelBuffer(opts: {
  buffer: Buffer;
  sourceFilename: string;
  userId: string | null;
  dryRun?: boolean;
}): Promise<ExtraImportReport> {
  const dryRun = !!opts.dryRun;
  const sourceSha256 = sha256(opts.buffer);
  const report: ExtraImportReport = {
    dryRun,
    sourceFilename: opts.sourceFilename,
    sourceSha256,
    batchId: null,
    skippedDuplicateBatch: false,
    counts: {
      anagraficaPeople: 0,
      anagraficaCompanies: 0,
      beneficiariesCreated: 0,
      beneficiariesReused: 0,
      tripsRead: 0,
      tripsImported: 0,
      tripsSkipped: 0,
      compensationsCad: 0,
      compensationsTerzista: 0,
      carriersMatched: 0,
      carriersUnmatched: 0,
    },
    issues: [],
  };

  const existingBatch = await findBatchByHash(sourceSha256);
  if (existingBatch && !dryRun) {
    report.skippedDuplicateBatch = true;
    report.batchId = existingBatch;
    report.issues.push({
      level: 'info',
      code: 'DUPLICATE_FILE',
      message: `File già importato (batch ${existingBatch}). Nessuna modifica.`,
    });
    return report;
  }

  const wb = XLSX.read(opts.buffer, { type: 'buffer', cellDates: true });
  if (!wb.SheetNames.includes('Anagrafiche') || !wb.SheetNames.includes('extra - cad-hoc')) {
    report.issues.push({
      level: 'error',
      code: 'MISSING_SHEETS',
      message: 'Fogli richiesti: Anagrafiche, extra - cad-hoc',
    });
    return report;
  }

  const anaRows = XLSX.utils.sheet_to_json(wb.Sheets['Anagrafiche'], {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];
  const extraRows = XLSX.utils.sheet_to_json(wb.Sheets['extra - cad-hoc'], {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  // Find header row for extra sheet (contains "Viaggio")
  let headerIdx = extraRows.findIndex(
    (r) => Array.isArray(r) && String(r[0] ?? '').trim().toLowerCase() === 'viaggio'
  );
  if (headerIdx < 0) headerIdx = 5;

  const conn = await pool.getConnection();
  const beneficiaryCache = new Map<string, string>();

  try {
    if (!dryRun) await conn.beginTransaction();

    const carriers = await loadCarrierMap(conn);
    const batchId = randomUUID();
    report.batchId = dryRun ? null : batchId;

    if (!dryRun) {
      await conn.execute(
        `INSERT INTO extra_import_batches
          (id, source_filename, source_sha256, imported_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          batchId,
          opts.sourceFilename,
          sourceSha256,
          opts.userId,
          'Import Extra Partesa (extra - cad-hoc + Anagrafiche)',
        ]
      );
    }

    // Anagrafiche A/B
    for (let i = 1; i < anaRows.length; i++) {
      const row = anaRows[i];
      if (!row) continue;
      const name = text(cell(row, 0));
      if (!name) continue;
      const cdcRaw = text(cell(row, 1));
      const isCompany = (cdcRaw || '').toUpperCase() === 'AZIENDA/VETTORE';
      const kind = isCompany ? 'company' : 'employee';
      const cdc = isCompany ? null : cdcRaw;
      if (kind === 'company') report.counts.anagraficaCompanies++;
      else report.counts.anagraficaPeople++;

      if (!dryRun) {
        await upsertBeneficiary(conn, name, kind, cdc, opts.userId, beneficiaryCache, report);
      } else {
        const key = `${kind}::${name.toUpperCase()}`;
        if (!beneficiaryCache.has(key)) {
          beneficiaryCache.set(key, `dry-${kind}-${beneficiaryCache.size + 1}`);
          report.counts.beneficiariesCreated++;
        } else {
          report.counts.beneficiariesReused++;
        }
      }
    }

    // Preload beneficiaries from DB into cache for payee resolution
    if (!dryRun) {
      const [allB] = await conn.query<RowDataPacket[]>(
        'SELECT id, name, kind FROM extra_beneficiaries'
      );
      for (const b of allB) {
        beneficiaryCache.set(`${b.kind}::${String(b.name).toUpperCase()}`, String(b.id));
      }
    }

    const dataRows = extraRows.slice(headerIdx + 1);
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const excelRow = headerIdx + 2 + i; // 1-based approx
      if (!row || !row.some((c) => c != null && String(c).trim() !== '')) continue;

      report.counts.tripsRead++;
      const tripNumber = text(cell(row, 0));
      const orderRef = text(cell(row, 1));
      const tripDate = parseDate(cell(row, 2));
      const carrierDesc = text(cell(row, 3));
      const packages = parseEuro(cell(row, 4));
      const clientAmount = parseEuro(cell(row, 5));
      const serviceNotes = text(cell(row, 6));
      const isExtra = isTrue(cell(row, 8));
      const isCad = isTrue(cell(row, 9));
      const booklet = text(cell(row, 10));
      const vouchersRaw = cell(row, 11);
      const vouchers =
        vouchersRaw == null || vouchersRaw === ''
          ? null
          : Number(vouchersRaw);
      const payee = text(cell(row, 12));
      const terzistaAmount = parseEuro(cell(row, 13));
      const archived = isTrue(cell(row, 14));
      const billingNotes = text(cell(row, 15));

      const hasCad = isCad || (vouchers != null && !Number.isNaN(vouchers));
      const hasSub = terzistaAmount != null && terzistaAmount !== 0;

      if (!tripDate) {
        report.counts.tripsSkipped++;
        report.issues.push({
          level: 'error',
          sheet: 'extra - cad-hoc',
          row: excelRow,
          code: 'MISSING_DATE',
          message: `Riga senza data valida (viaggio=${tripNumber ?? '—'})`,
        });
        continue;
      }

      let carrierCod: number | null = null;
      if (carrierDesc) {
        carrierCod = carriers.get(carrierDesc.toUpperCase()) ?? null;
        if (carrierCod != null) report.counts.carriersMatched++;
        else {
          report.counts.carriersUnmatched++;
          report.issues.push({
            level: 'warning',
            sheet: 'extra - cad-hoc',
            row: excelRow,
            code: 'CARRIER_UNMATCHED',
            message: `Vettore non trovato in tab_vettori: ${carrierDesc}`,
          });
        }
      }

      if (hasCad && hasSub) {
        report.issues.push({
          level: 'warning',
          sheet: 'extra - cad-hoc',
          row: excelRow,
          code: 'BOTH_COSTS',
          message: 'Riga con cad-hoc e terzista insieme (conservata)',
        });
      }

      if (hasCad && vouchers == null) {
        report.issues.push({
          level: 'warning',
          sheet: 'extra - cad-hoc',
          row: excelRow,
          code: 'CAD_MISSING_VOUCHERS',
          message: 'Cad-hoc senza numero buoni',
        });
      }
      if (hasCad && !booklet) {
        report.issues.push({
          level: 'warning',
          sheet: 'extra - cad-hoc',
          row: excelRow,
          code: 'CAD_MISSING_BOOKLET',
          message: 'Cad-hoc senza riferimento blocchetto',
        });
      }

      let payeeEmployeeId: string | null = null;
      let payeeCompanyId: string | null = null;

      if (payee) {
        payeeEmployeeId = beneficiaryCache.get(`employee::${payee.toUpperCase()}`) || null;
        payeeCompanyId = beneficiaryCache.get(`company::${payee.toUpperCase()}`) || null;

        if (!payeeEmployeeId && !payeeCompanyId) {
          // create unresolved as employee if cad, company if sub only, else employee + warning
          const inferred: 'employee' | 'company' = hasCad && !hasSub ? 'employee' : hasSub && !hasCad ? 'company' : 'employee';
          report.issues.push({
            level: 'warning',
            sheet: 'extra - cad-hoc',
            row: excelRow,
            code: 'PAYEE_UNKNOWN',
            message: `Beneficiario non in Anagrafiche: ${payee} (creato come ${inferred})`,
          });
          if (!dryRun) {
            const id = await upsertBeneficiary(
              conn,
              payee,
              inferred,
              null,
              opts.userId,
              beneficiaryCache,
              report
            );
            if (inferred === 'employee') payeeEmployeeId = id;
            else payeeCompanyId = id;
          }
        }

        if (hasCad && !payeeEmployeeId && payeeCompanyId) {
          report.issues.push({
            level: 'warning',
            sheet: 'extra - cad-hoc',
            row: excelRow,
            code: 'CAD_PAYEE_IS_COMPANY',
            message: `Cad-hoc con beneficiario azienda (${payee}): importato con link azienda, da revisionare`,
          });
        }
        if (hasSub && !payeeCompanyId && payeeEmployeeId) {
          report.issues.push({
            level: 'warning',
            sheet: 'extra - cad-hoc',
            row: excelRow,
            code: 'SUB_PAYEE_IS_EMPLOYEE',
            message: `Terzista con beneficiario dipendente (${payee}): importato con link dipendente, da revisionare`,
          });
        }
        if ((hasCad || hasSub) && !payee) {
          report.issues.push({
            level: 'warning',
            sheet: 'extra - cad-hoc',
            row: excelRow,
            code: 'COST_WITHOUT_PAYEE',
            message: 'Costo presente senza beneficiario',
          });
        }
      } else if (hasCad || hasSub) {
        report.issues.push({
          level: 'warning',
          sheet: 'extra - cad-hoc',
          row: excelRow,
          code: 'COST_WITHOUT_PAYEE',
          message: 'Costo presente senza beneficiario',
        });
      }

      if (dryRun) {
        report.counts.tripsImported++;
        if (hasCad) report.counts.compensationsCad++;
        if (hasSub) report.counts.compensationsTerzista++;
        continue;
      }

      const tripId = randomUUID();
      await conn.execute(
        `INSERT INTO extra_trips
          (id, trip_number, order_ref, trip_date, carrier_cod_vettore, carrier_description,
           packages, service_notes, is_extra, client_amount, archived, billing_notes,
           import_batch_id, import_source_row, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripId,
          tripNumber,
          orderRef,
          tripDate,
          carrierCod,
          carrierDesc,
          packages,
          serviceNotes,
          isExtra ? 1 : 0,
          clientAmount,
          archived ? 1 : 0,
          billingNotes,
          batchId,
          excelRow,
          opts.userId,
          opts.userId,
        ]
      );
      report.counts.tripsImported++;

      if (hasCad) {
        await conn.execute(
          `INSERT INTO extra_compensations
            (id, trip_id, cost_type, beneficiary_id, booklet_ref, vouchers_count, voucher_unit_value, terzista_amount, created_by, updated_by)
           VALUES (?, ?, 'cad_hoc', ?, ?, ?, ?, NULL, ?, ?)`,
          [
            randomUUID(),
            tripId,
            payeeEmployeeId || payeeCompanyId,
            booklet,
            vouchers != null && !Number.isNaN(vouchers) ? Math.trunc(vouchers) : null,
            DEFAULT_VOUCHER_VALUE,
            opts.userId,
            opts.userId,
          ]
        );
        report.counts.compensationsCad++;
      }
      if (hasSub) {
        await conn.execute(
          `INSERT INTO extra_compensations
            (id, trip_id, cost_type, beneficiary_id, booklet_ref, vouchers_count, voucher_unit_value, terzista_amount, created_by, updated_by)
           VALUES (?, ?, 'terzista', ?, NULL, NULL, NULL, ?, ?, ?)`,
          [
            randomUUID(),
            tripId,
            payeeCompanyId || payeeEmployeeId,
            terzistaAmount,
            opts.userId,
            opts.userId,
          ]
        );
        report.counts.compensationsTerzista++;
      }
    }

    if (!dryRun) {
      await conn.execute(
        `UPDATE extra_import_batches
         SET row_count = ?, trip_count = ?, compensation_count = ?, beneficiary_count = ?
         WHERE id = ?`,
        [
          report.counts.tripsRead,
          report.counts.tripsImported,
          report.counts.compensationsCad + report.counts.compensationsTerzista,
          report.counts.beneficiariesCreated,
          batchId,
        ]
      );
      await conn.commit();
    }
  } catch (e) {
    if (!dryRun) await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return report;
}
