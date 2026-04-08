/**
 * Filtri handling allineati a Delivery: senza filtri attivi si restringe a data_mov_m >= ultimi 3 mesi.
 */

export function getHandlingDefaultDataMovFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

const FILTER_KEYS = [
  'bu',
  'div',
  'dep',
  'tipo_movimento',
  'doc_acq',
  'data_mov_m',
  'tipo_imb',
  'mese',
  'anno',
] as const;

/**
 * Costruisce condizioni WHERE (stessa logica di /api/handling/data).
 * Se nessun filtro restringe l'insieme, aggiunge data_mov_m >= [3 mesi fa].
 */
export function buildHandlingWhereParts(searchParams: URLSearchParams): {
  conditions: string[];
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const filters: Record<(typeof FILTER_KEYS)[number], string | null> = {
    bu: searchParams.get('bu'),
    div: searchParams.get('div'),
    dep: searchParams.get('dep'),
    tipo_movimento: searchParams.get('tipo_movimento'),
    doc_acq: searchParams.get('doc_acq'),
    data_mov_m: searchParams.get('data_mov_m'),
    tipo_imb: searchParams.get('tipo_imb'),
    mese: searchParams.get('mese'),
    anno: searchParams.get('anno'),
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'Tutti' && value !== 'Tutte' && value !== '') {
      if (key === 'doc_acq') {
        conditions.push(`\`${key}\` LIKE ?`);
        params.push(`%${value}%`);
      } else if (key === 'data_mov_m') {
        conditions.push(`DATE(\`${key}\`) = ?`);
        params.push(value);
      } else if (key === 'mese') {
        conditions.push(
          '(mese_fatturazione = ? OR (mese_fatturazione IS NULL AND mese = ?))'
        );
        params.push(parseInt(value, 10), parseInt(value, 10));
      } else if (key === 'anno') {
        conditions.push(
          '(anno_fatturazione = ? OR (anno_fatturazione IS NULL AND YEAR(data_mov_m) = ?))'
        );
        params.push(parseInt(value, 10), parseInt(value, 10));
      } else {
        conditions.push(`\`${key}\` = ?`);
        params.push(value);
      }
    }
  });

  if (conditions.length === 0) {
    conditions.push('data_mov_m >= ?');
    params.push(getHandlingDefaultDataMovFromDate());
  }

  return { conditions, params };
}

export function handlingFiltersShowDefaultWindowBanner(
  filters: Record<string, unknown>
): boolean {
  for (const key of FILTER_KEYS) {
    const v = filters[key];
    if (
      v !== undefined &&
      v !== null &&
      String(v) !== '' &&
      String(v) !== 'Tutti' &&
      String(v) !== 'Tutte'
    ) {
      return false;
    }
  }
  return true;
}
