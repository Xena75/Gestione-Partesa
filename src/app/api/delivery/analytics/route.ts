import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';

type MeasureKey =
  | 'righe'
  | 'colli'
  | 'compenso'
  | 'tot_compenso'
  | 'consegne_distinte'
  | 'ordini_distinti'
  | 'vettori_distinti';

const MEASURE_SQL: Record<MeasureKey, string> = {
  righe: 'COUNT(*)',
  colli: 'SUM(`colli`)',
  compenso: 'SUM(`compenso`)',
  tot_compenso: 'SUM(`tot_compenso`)',
  consegne_distinte: 'COUNT(DISTINCT `consegna_num`)',
  ordini_distinti: 'COUNT(DISTINCT `ordine`)',
  vettori_distinti: 'COUNT(DISTINCT `cod_vettore`)'
};

const MEASURE_LABEL: Record<MeasureKey, string> = {
  righe: 'N° righe',
  colli: 'Colli',
  compenso: 'Compenso (€)',
  tot_compenso: 'Tot. compenso (€)',
  consegne_distinte: 'Consegne (distinte)',
  ordini_distinti: 'Ordini (distinti)',
  vettori_distinti: 'Vettori (distinti)'
};

// Misure "distinte": la somma delle celle non è additiva → niente totali lato UI
const DISTINCT_MEASURES: MeasureKey[] = ['consegne_distinte', 'ordini_distinti', 'vettori_distinti'];

type DimKey =
  | 'vettore'
  | 'bu'
  | 'deposito'
  | 'divisione'
  | 'tipologia'
  | 'classe_prod'
  | 'mese'
  | 'anno'
  | 'settimana'
  | 'giorno';

type DimType = 'string' | 'mese' | 'anno' | 'settimana' | 'giorno';

const DIMENSIONS: Record<DimKey, { sql: string; type: DimType; label: string }> = {
  vettore: { sql: '`descr_vettore`', type: 'string', label: 'Vettore' },
  bu: { sql: '`bu`', type: 'string', label: 'BU' },
  deposito: { sql: '`dep`', type: 'string', label: 'Deposito' },
  divisione: { sql: '`div`', type: 'string', label: 'Divisione' },
  tipologia: { sql: '`tipologia`', type: 'string', label: 'Tipologia' },
  classe_prod: { sql: '`descr_classe_prod`', type: 'string', label: 'Classe prodotto' },
  mese: { sql: 'CAST(`mese` AS UNSIGNED)', type: 'mese', label: 'Mese' },
  anno: { sql: 'CAST(`anno` AS UNSIGNED)', type: 'anno', label: 'Anno' },
  settimana: { sql: 'CAST(`settimana` AS UNSIGNED)', type: 'settimana', label: 'Settimana' },
  giorno: { sql: 'WEEKDAY(`data_mov_merce`)', type: 'giorno', label: 'Giorno settimana' }
};

const MESI_LABEL = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const GIORNI_LABEL = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function labelFor(type: DimType, key: string): string {
  if (type === 'mese') return MESI_LABEL[Number(key) - 1] || key;
  if (type === 'giorno') return GIORNI_LABEL[Number(key)] || key;
  if (type === 'settimana') return `S${key}`;
  return key;
}

function buildKeys(type: DimType, presentKeys: string[], totals: Record<string, number>): string[] {
  if (type === 'mese') return MESI_LABEL.map((_, i) => String(i + 1));
  if (type === 'giorno') return GIORNI_LABEL.map((_, i) => String(i));
  if (type === 'settimana') {
    return [...new Set(presentKeys)].sort((a, b) => Number(a) - Number(b));
  }
  if (type === 'anno') {
    return [...new Set(presentKeys)].sort((a, b) => Number(b) - Number(a));
  }
  return [...new Set(presentKeys)].sort((a, b) => {
    const diff = (totals[b] || 0) - (totals[a] || 0);
    return diff !== 0 ? diff : a.localeCompare(b, 'it', { sensitivity: 'base' });
  });
}

async function distinctValues(column: string): Promise<string[]> {
  const sql = `SELECT DISTINCT ${column} AS v FROM fatt_delivery WHERE ${column} IS NOT NULL AND ${column} != '' ORDER BY v`;
  const [rows] = await pool.query(sql);
  return (rows as any[]).map((r) => String(r.v));
}

/** Filtri comuni (anno, mese, bu, dep, tipologia, vettore) condivisi tra pivot, KPI e dettaglio. */
function buildBaseFilters(searchParams: URLSearchParams): {
  conditions: string[];
  params: (string | number)[];
} {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const annoParam = searchParams.get('anno');
  if (annoParam && annoParam !== 'all') {
    const annoNum = parseInt(annoParam, 10);
    if (!Number.isNaN(annoNum)) {
      conditions.push('CAST(`anno` AS UNSIGNED) = ?');
      params.push(annoNum);
    }
  }

  const meseParam = parseInt(searchParams.get('mese') || '', 10);
  if (!Number.isNaN(meseParam) && meseParam >= 1 && meseParam <= 12) {
    conditions.push('CAST(`mese` AS UNSIGNED) = ?');
    params.push(meseParam);
  }

  const buFiltro = searchParams.getAll('bu').filter(Boolean);
  if (buFiltro.length > 0) {
    conditions.push(`\`bu\` IN (${buFiltro.map(() => '?').join(',')})`);
    params.push(...buFiltro);
  }

  const depFiltro = searchParams.getAll('dep').filter(Boolean);
  if (depFiltro.length > 0) {
    conditions.push(`\`dep\` IN (${depFiltro.map(() => '?').join(',')})`);
    params.push(...depFiltro);
  }

  const tipFiltro = searchParams.getAll('tipologia').filter(Boolean);
  if (tipFiltro.length > 0) {
    conditions.push(`\`tipologia\` IN (${tipFiltro.map(() => '?').join(',')})`);
    params.push(...tipFiltro);
  }

  const vettoriFiltro = searchParams.getAll('vettore').filter(Boolean);
  const vettoreMode = searchParams.get('vettoreMode') === 'exclude' ? 'exclude' : 'include';
  if (vettoriFiltro.length > 0) {
    const operator = vettoreMode === 'exclude' ? 'NOT IN' : 'IN';
    conditions.push(`\`descr_vettore\` ${operator} (${vettoriFiltro.map(() => '?').join(',')})`);
    params.push(...vettoriFiltro);
  }

  return { conditions, params };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Branch META: opzioni filtri
    if (searchParams.get('meta') === '1') {
      const [anniRows] = await pool.query(
        'SELECT DISTINCT `anno` AS anno FROM fatt_delivery WHERE `anno` IS NOT NULL ORDER BY anno DESC'
      );
      const [bu, depositi, tipologie, vettori] = await Promise.all([
        distinctValues('`bu`'),
        distinctValues('`dep`'),
        distinctValues('`tipologia`'),
        distinctValues('`descr_vettore`')
      ]);

      return NextResponse.json({
        anni: (anniRows as any[]).map((r) => Number(r.anno)).filter((n) => !Number.isNaN(n)),
        bu,
        depositi,
        tipologie,
        vettori,
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

    // Branch DETAIL: dettaglio per un valore della dimensione di riga.
    // Per le misure "distinte" mostra l'elenco dei valori distinti (con aggregati),
    // altrimenti mostra le righe grezze.
    if (searchParams.get('detail') === '1') {
      const rowDimParam = (searchParams.get('rowDim') || 'vettore') as DimKey;
      const rowDimD: DimKey = DIMENSIONS[rowDimParam] ? rowDimParam : 'vettore';
      const rowType = DIMENSIONS[rowDimD].type;
      const rowValue = searchParams.get('rowValue') ?? '';

      const detMeasureParam = (searchParams.get('measure') || 'righe') as MeasureKey;
      const detMeasure: MeasureKey = MEASURE_SQL[detMeasureParam] ? detMeasureParam : 'righe';

      const { conditions, params } = buildBaseFilters(searchParams);
      conditions.push(`${DIMENSIONS[rowDimD].sql} = ?`);
      params.push(rowType === 'string' ? rowValue : Number(rowValue));

      // Filtro opzionale sulla colonna della pivot (clic su una cella riga+colonna)
      const colDimParamD = searchParams.get('colDim') as DimKey | null;
      const colValue = searchParams.get('colValue');
      if (colDimParamD && DIMENSIONS[colDimParamD] && colValue !== null && colValue !== '') {
        const colType = DIMENSIONS[colDimParamD].type;
        conditions.push(`${DIMENSIONS[colDimParamD].sql} = ?`);
        params.push(colType === 'string' ? colValue : Number(colValue));
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
      const offset = (page - 1) * limit;

      // Configurazione raggruppamento per le misure distinte
      const distinctGroup: Partial<Record<MeasureKey, { groupBy: string; select: string }>> = {
        consegne_distinte: {
          groupBy: '`consegna_num`',
          select: `
            \`consegna_num\` AS valore,
            MIN(\`ordine\`) AS ordine,
            MIN(\`ragione_sociale\`) AS ragione_sociale,
            MIN(\`descr_vettore\`) AS descr_vettore,
            COUNT(DISTINCT \`viaggio\`) AS viaggi,
            COUNT(*) AS righe,
            SUM(\`colli\`) AS colli,
            SUM(\`compenso\`) AS compenso,
            SUM(\`tot_compenso\`) AS tot_compenso
          `
        },
        ordini_distinti: {
          groupBy: '`ordine`',
          select: `
            \`ordine\` AS valore,
            MIN(\`ragione_sociale\`) AS ragione_sociale,
            MIN(\`descr_vettore\`) AS descr_vettore,
            COUNT(DISTINCT \`viaggio\`) AS viaggi,
            COUNT(DISTINCT \`consegna_num\`) AS consegne,
            COUNT(*) AS righe,
            SUM(\`colli\`) AS colli,
            SUM(\`compenso\`) AS compenso,
            SUM(\`tot_compenso\`) AS tot_compenso
          `
        },
        vettori_distinti: {
          groupBy: '`cod_vettore`, `descr_vettore`',
          select: `
            \`descr_vettore\` AS valore,
            \`cod_vettore\` AS cod_vettore,
            COUNT(DISTINCT \`viaggio\`) AS viaggi,
            COUNT(DISTINCT \`consegna_num\`) AS consegne,
            COUNT(DISTINCT \`ordine\`) AS ordini,
            COUNT(*) AS righe,
            SUM(\`colli\`) AS colli,
            SUM(\`compenso\`) AS compenso,
            SUM(\`tot_compenso\`) AS tot_compenso
          `
        }
      };

      const grp = distinctGroup[detMeasure];

      if (grp) {
        // Modalità "distinct": elenco valori distinti con aggregati
        const [countRows] = await pool.query(
          `SELECT COUNT(*) AS total FROM (SELECT 1 FROM fatt_delivery ${where} GROUP BY ${grp.groupBy}) t`,
          params
        );
        const total = Number((countRows as any[])[0]?.total) || 0;

        const dataSql = `
          SELECT ${grp.select}
          FROM fatt_delivery
          ${where}
          GROUP BY ${grp.groupBy}
          ORDER BY valore ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const [detailRows] = await pool.query(dataSql, params);

        return NextResponse.json({
          mode: 'distinct',
          measure: detMeasure,
          rows: detailRows,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit))
        });
      }

      // Modalità "rows": righe grezze
      const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM fatt_delivery ${where}`, params);
      const total = Number((countRows as any[])[0]?.total) || 0;

      const dataSql = `
        SELECT
          \`data_mov_merce\`, \`viaggio\`, \`ordine\`, \`consegna_num\`, \`ragione_sociale\`,
          \`descr_vettore\`, \`bu\`, \`dep\`, \`tipologia\`,
          \`colli\`, \`compenso\`, \`tot_compenso\`
        FROM fatt_delivery
        ${where}
        ORDER BY \`data_mov_merce\` ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [detailRows] = await pool.query(dataSql, params);

      return NextResponse.json({
        mode: 'rows',
        measure: detMeasure,
        rows: detailRows,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      });
    }

    // Misura (whitelist)
    const measureParam = (searchParams.get('measure') || 'righe') as MeasureKey;
    const measure: MeasureKey = MEASURE_SQL[measureParam] ? measureParam : 'righe';
    const aggSql = MEASURE_SQL[measure];

    // Dimensioni (whitelist)
    const rowDimParam = (searchParams.get('rowDim') || 'vettore') as DimKey;
    const colDimParam = (searchParams.get('colDim') || 'mese') as DimKey;
    const rowDim: DimKey = DIMENSIONS[rowDimParam] ? rowDimParam : 'vettore';
    let colDim: DimKey = DIMENSIONS[colDimParam] ? colDimParam : 'mese';
    if (colDim === rowDim) {
      colDim = rowDim === 'mese' ? 'vettore' : 'mese';
    }

    // Filtri (condivisi con KPI e dettaglio)
    const { conditions: whereConditions, params: queryParams } = buildBaseFilters(searchParams);
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const rowSql = DIMENSIONS[rowDim].sql;
    const colSql = DIMENSIONS[colDim].sql;
    const rowType = DIMENSIONS[rowDim].type;
    const colType = DIMENSIONS[colDim].type;

    const sql = `
      SELECT
        ${rowSql} AS rowKey,
        ${colSql} AS colKey,
        ${aggSql} AS valore
      FROM fatt_delivery
      ${whereClause}
      GROUP BY ${rowSql}, ${colSql}
    `;
    const [rows] = await pool.query(sql, queryParams);

    // KPI (stessi filtri)
    const kpiSql = `
      SELECT
        COUNT(*) AS righe,
        SUM(\`colli\`) AS colli,
        SUM(\`compenso\`) AS compenso,
        SUM(\`tot_compenso\`) AS tot_compenso,
        COUNT(DISTINCT \`consegna_num\`) AS consegne,
        COUNT(DISTINCT \`ordine\`) AS ordini,
        COUNT(DISTINCT \`cod_vettore\`) AS vettori,
        COUNT(DISTINCT \`cod_cliente\`) AS clienti
      FROM fatt_delivery
      ${whereClause}
    `;
    const [kpiRows] = await pool.query(kpiSql, queryParams);
    const kpiRaw = (kpiRows as any[])[0] || {};
    const kpi = {
      righe: Number(kpiRaw.righe) || 0,
      colli: Number(kpiRaw.colli) || 0,
      compenso: Number(kpiRaw.compenso) || 0,
      tot_compenso: Number(kpiRaw.tot_compenso) || 0,
      consegne: Number(kpiRaw.consegne) || 0,
      ordini: Number(kpiRaw.ordini) || 0,
      vettori: Number(kpiRaw.vettori) || 0,
      clienti: Number(kpiRaw.clienti) || 0
    };

    // Aggregazione pivot generica
    const cellMap = new Map<string, Record<string, number>>();
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
      measure,
      measureLabel: MEASURE_LABEL[measure],
      isDistinct: DISTINCT_MEASURES.includes(measure),
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
    console.error('Errore API analytics delivery:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
