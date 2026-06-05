import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';
import { getDistinctValues } from '@/lib/data-viaggi-tab';

type MeasureKey =
  | 'viaggi'
  | 'trasportatori'
  | 'colli'
  | 'peso'
  | 'km'
  | 'kmViaggio'
  | 'ordini'
  | 'toccate'
  | 'orePod'
  | 'litri'
  | 'euroRifornimento';

const MEASURE_SQL: Record<MeasureKey, string> = {
  viaggi: 'COUNT(*)',
  trasportatori: 'COUNT(DISTINCT `Nome Trasportatore`)',
  colli: 'SUM(`Colli`)',
  peso: 'SUM(`Peso (Kg)`)',
  km: 'SUM(`Km`)',
  kmViaggio: 'SUM(`Km Viaggio`)',
  ordini: 'SUM(`Ordini`)',
  toccate: 'SUM(`Toccate`)',
  orePod: 'SUM(`Ore PoD`)',
  litri: 'SUM(`Litri Riforniti`)',
  euroRifornimento: 'SUM(`euro_rifornimento`)'
};

const MEASURE_LABEL: Record<MeasureKey, string> = {
  viaggi: 'N° viaggi',
  trasportatori: 'Trasportatori (distinti)',
  colli: 'Colli',
  peso: 'Peso (Kg)',
  km: 'Km',
  kmViaggio: 'Km Viaggio',
  ordini: 'Ordini',
  toccate: 'Toccate',
  orePod: 'Ore PoD',
  litri: 'Litri Riforniti',
  euroRifornimento: 'Costo rifornimento (€)'
};

type DimKey = 'trasportatore' | 'mese' | 'giorno' | 'magazzino';
type DimType = 'string' | 'mese' | 'giorno';

const DIMENSIONS: Record<DimKey, { sql: string; type: DimType; label: string }> = {
  trasportatore: { sql: '`Nome Trasportatore`', type: 'string', label: 'Trasportatore' },
  mese: { sql: 'CAST(`Mese` AS UNSIGNED)', type: 'mese', label: 'Mese' },
  giorno: { sql: 'WEEKDAY(`Data`)', type: 'giorno', label: 'Giorno settimana' },
  magazzino: { sql: '`Magazzino di partenza`', type: 'string', label: 'Magazzino' }
};

const MESI_LABEL = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const GIORNI_LABEL = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function labelFor(type: DimType, key: string): string {
  if (type === 'mese') return MESI_LABEL[Number(key) - 1] || key;
  if (type === 'giorno') return GIORNI_LABEL[Number(key)] || key;
  return key;
}

/** Insieme ordinato di chiavi per una dimensione (set fisso per mese/giorno, presenti per le stringhe). */
function buildKeys(type: DimType, presentKeys: string[], totals: Record<string, number>): string[] {
  if (type === 'mese') return MESI_LABEL.map((_, i) => String(i + 1));
  if (type === 'giorno') return GIORNI_LABEL.map((_, i) => String(i));
  // stringhe: ordina per totale desc, poi alfabetico
  return [...new Set(presentKeys)].sort((a, b) => {
    const diff = (totals[b] || 0) - (totals[a] || 0);
    return diff !== 0 ? diff : a.localeCompare(b, 'it', { sensitivity: 'base' });
  });
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Branch META: opzioni per i filtri
    if (searchParams.get('meta') === '1') {
      const [anniRows] = await pool.query(
        'SELECT DISTINCT YEAR(`Data`) AS anno FROM tab_viaggi WHERE `Data` IS NOT NULL ORDER BY anno DESC'
      );
      const [tipiRows] = await pool.query(
        "SELECT DISTINCT `Tipo_Vettore` AS tipo FROM tab_viaggi WHERE `Tipo_Vettore` IS NOT NULL AND `Tipo_Vettore` != '' ORDER BY tipo"
      );
      const [magazzini, trasportatori] = await Promise.all([
        getDistinctValues('Magazzino di partenza'),
        getDistinctValues('Nome Trasportatore')
      ]);

      return NextResponse.json({
        anni: (anniRows as any[]).map((r) => Number(r.anno)).filter((n) => !Number.isNaN(n)),
        magazzini: (magazzini as any[]).filter(Boolean).sort(),
        trasportatori: (trasportatori as any[]).filter(Boolean).sort(),
        tipiVettore: (tipiRows as any[]).map((r) => r.tipo).filter(Boolean),
        measures: (Object.keys(MEASURE_LABEL) as MeasureKey[]).map((key) => ({
          key,
          label: MEASURE_LABEL[key]
        })),
        dimensioni: (Object.keys(DIMENSIONS) as DimKey[]).map((key) => ({
          key,
          label: DIMENSIONS[key].label
        }))
      });
    }

    // Misura (whitelist)
    const measureParam = (searchParams.get('measure') || 'viaggi') as MeasureKey;
    const measure: MeasureKey = MEASURE_SQL[measureParam] ? measureParam : 'viaggi';
    const aggSql = MEASURE_SQL[measure];

    // Dimensioni righe/colonne (whitelist)
    const rowDimParam = (searchParams.get('rowDim') || 'trasportatore') as DimKey;
    const colDimParam = (searchParams.get('colDim') || 'mese') as DimKey;
    const rowDim: DimKey = DIMENSIONS[rowDimParam] ? rowDimParam : 'trasportatore';
    let colDim: DimKey = DIMENSIONS[colDimParam] ? colDimParam : 'mese';
    if (colDim === rowDim) {
      // evita righe e colonne identiche: ripiega su una dimensione diversa
      colDim = rowDim === 'mese' ? 'trasportatore' : 'mese';
    }

    // Anno (default: corrente)
    const annoParam = parseInt(searchParams.get('anno') || '', 10);
    const anno = Number.isNaN(annoParam) ? new Date().getFullYear() : annoParam;

    // Filtri
    const magazzini = searchParams.getAll('magazzino').filter(Boolean);
    const trasportatori = searchParams.getAll('trasportatore').filter(Boolean);
    const trasportatoreMode = searchParams.get('trasportatoreMode') === 'exclude' ? 'exclude' : 'include';
    const tipoVettore = searchParams.get('tipoVettore');

    const whereConditions: string[] = ['YEAR(`Data`) = ?'];
    const queryParams: (string | number)[] = [anno];

    if (magazzini.length > 0) {
      whereConditions.push(`\`Magazzino di partenza\` IN (${magazzini.map(() => '?').join(',')})`);
      queryParams.push(...magazzini);
    }
    if (trasportatori.length > 0) {
      const placeholders = trasportatori.map(() => '?').join(',');
      const operator = trasportatoreMode === 'exclude' ? 'NOT IN' : 'IN';
      whereConditions.push(`\`Nome Trasportatore\` ${operator} (${placeholders})`);
      queryParams.push(...trasportatori);
    }
    if (tipoVettore) {
      whereConditions.push('`Tipo_Vettore` = ?');
      queryParams.push(tipoVettore);
    }

    const meseParam = parseInt(searchParams.get('mese') || '', 10);
    if (!Number.isNaN(meseParam) && meseParam >= 1 && meseParam <= 12) {
      whereConditions.push('CAST(`Mese` AS UNSIGNED) = ?');
      queryParams.push(meseParam);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const rowSql = DIMENSIONS[rowDim].sql;
    const colSql = DIMENSIONS[colDim].sql;
    const rowType = DIMENSIONS[rowDim].type;
    const colType = DIMENSIONS[colDim].type;

    const sql = `
      SELECT
        ${rowSql} AS rowKey,
        ${colSql} AS colKey,
        ${aggSql} AS valore
      FROM tab_viaggi
      ${whereClause}
      GROUP BY ${rowSql}, ${colSql}
    `;

    const [rows] = await pool.query(sql, queryParams);

    // KPI riepilogo (stessi filtri)
    const kpiSql = `
      SELECT
        COUNT(*) AS viaggi,
        COUNT(DISTINCT \`Nome Trasportatore\`) AS trasportatori,
        SUM(\`Colli\`) AS colli,
        SUM(\`Peso (Kg)\`) AS peso,
        SUM(\`Km\`) AS km,
        SUM(\`Ordini\`) AS ordini,
        SUM(\`Toccate\`) AS toccate,
        SUM(\`Ore PoD\`) AS orePod
      FROM tab_viaggi
      ${whereClause}
    `;
    const [kpiRows] = await pool.query(kpiSql, queryParams);
    const kpiRaw = (kpiRows as any[])[0] || {};
    const kpi = {
      viaggi: Number(kpiRaw.viaggi) || 0,
      trasportatori: Number(kpiRaw.trasportatori) || 0,
      colli: Number(kpiRaw.colli) || 0,
      peso: Number(kpiRaw.peso) || 0,
      km: Number(kpiRaw.km) || 0,
      ordini: Number(kpiRaw.ordini) || 0,
      toccate: Number(kpiRaw.toccate) || 0,
      orePod: Number(kpiRaw.orePod) || 0
    };

    // Aggregazione pivot generica
    const cellMap = new Map<string, Record<string, number>>(); // rowKey -> { colKey: valore }
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    const presentColKeys: string[] = [];
    const presentRowKeys: string[] = [];
    let totaleGenerale = 0;

    for (const r of rows as any[]) {
      if (r.rowKey === null || r.rowKey === undefined) continue;
      if (r.colKey === null || r.colKey === undefined) continue;
      const rk = String(r.rowKey);
      const ck = String(r.colKey);
      const valore = Number(r.valore) || 0;

      if (!cellMap.has(rk)) {
        cellMap.set(rk, {});
        presentRowKeys.push(rk);
      }
      const cells = cellMap.get(rk)!;
      cells[ck] = (cells[ck] || 0) + valore;

      rowTotals[rk] = (rowTotals[rk] || 0) + valore;
      colTotals[ck] = (colTotals[ck] || 0) + valore;
      presentColKeys.push(ck);
      totaleGenerale += valore;
    }

    const colKeys = buildKeys(colType, presentColKeys, colTotals);
    const rowKeys = buildKeys(rowType, presentRowKeys, rowTotals).filter((k) =>
      // per mese/giorno mostra solo righe presenti, per stringhe sono già presenti
      rowType === 'string' ? true : presentRowKeys.includes(k)
    );

    const columns = colKeys.map((key) => ({ key, label: labelFor(colType, key) }));
    const righe = rowKeys.map((key) => ({
      key,
      label: labelFor(rowType, key),
      valori: cellMap.get(key) || {},
      totale: rowTotals[key] || 0
    }));

    return NextResponse.json({
      anno,
      measure,
      measureLabel: MEASURE_LABEL[measure],
      rowDim,
      colDim,
      rowDimLabel: DIMENSIONS[rowDim].label,
      colDimLabel: DIMENSIONS[colDim].label,
      kpi,
      columns,
      righe,
      totaliCol: colTotals,
      totaleGenerale
    });
  } catch (error) {
    console.error('Errore API analytics viaggi:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
