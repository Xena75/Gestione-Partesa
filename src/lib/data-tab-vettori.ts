// src/lib/data-tab-vettori.ts — tab_vettori in database gestionelogistica
import pool from './db-gestione';

export interface TabVettore {
  Cod_Vettore: number;
  Descr_Vettore: string | null;
  Tipo_Vettore: string | null;
  Azienda_Vettore: string | null;
  Nome_Vettore: string | null;
  Cognome_Vettore: string | null;
  Cellulare_Vettore: string | null;
  Email_Vettore: string | null;
  Data_Modifica: string | null;
  Targa_Mezzo: string | null;
  Id_Tariffa: string | null;
  Attivo: number;
}

export type TabVettoreInput = {
  Cod_Vettore: number;
  Descr_Vettore?: string | null;
  Tipo_Vettore?: string | null;
  Azienda_Vettore?: string | null;
  Nome_Vettore?: string | null;
  Cognome_Vettore?: string | null;
  Cellulare_Vettore?: string | null;
  Email_Vettore?: string | null;
  Targa_Mezzo?: string | null;
  Id_Tariffa?: string | null;
  Attivo?: number | boolean;
};

function parseCodVettore(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toAttivo(v: number | boolean | string | undefined | null): number {
  if (v === false || v === 0 || v === '0') return 0;
  return 1;
}

export async function listTabVettori(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  attivo?: 'all' | '0' | '1';
}): Promise<{ rows: TabVettore[]; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const term = (params.search ?? '').trim();
  const attivo = params.attivo ?? 'all';

  const clauses: string[] = [];
  const qparams: (string | number)[] = [];
  if (term) {
    const like = `%${term}%`;
    clauses.push(`(
      CAST(\`Cod_Vettore\` AS CHAR) LIKE ?
      OR \`Descr_Vettore\` LIKE ?
      OR \`Nome_Vettore\` LIKE ?
      OR \`Cognome_Vettore\` LIKE ?
      OR \`Azienda_Vettore\` LIKE ?
      OR \`Tipo_Vettore\` LIKE ?
    )`);
    qparams.push(like, like, like, like, like, like);
  }
  if (attivo === '0' || attivo === '1') {
    clauses.push('`Attivo` = ?');
    qparams.push(Number(attivo));
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS c FROM tab_vettori ${where}`,
    qparams
  );
  const total = Number((countRows as { c: number }[])[0]?.c ?? 0);

  const [rows] = await pool.query(
    `SELECT
      \`Cod_Vettore\`, \`Descr_Vettore\`, \`Tipo_Vettore\`, \`Azienda_Vettore\`,
      \`Nome_Vettore\`, \`Cognome_Vettore\`, \`Cellulare_Vettore\`, \`Email_Vettore\`,
      \`Data_Modifica\`, \`Targa_Mezzo\`, \`Id_Tariffa\`, \`Attivo\`
    FROM tab_vettori
    ${where}
    ORDER BY \`Descr_Vettore\` ASC, \`Cod_Vettore\` ASC
    LIMIT ? OFFSET ?`,
    [...qparams, pageSize, offset]
  );

  return { rows: rows as TabVettore[], total };
}

export async function getTabVettoreByCod(codRaw: string): Promise<TabVettore | null> {
  const cod = parseCodVettore(codRaw);
  if (cod === null) return null;
  const [rows] = await pool.query(
    `SELECT
      \`Cod_Vettore\`, \`Descr_Vettore\`, \`Tipo_Vettore\`, \`Azienda_Vettore\`,
      \`Nome_Vettore\`, \`Cognome_Vettore\`, \`Cellulare_Vettore\`, \`Email_Vettore\`,
      \`Data_Modifica\`, \`Targa_Mezzo\`, \`Id_Tariffa\`, \`Attivo\`
    FROM tab_vettori WHERE \`Cod_Vettore\` = ? LIMIT 1`,
    [cod]
  );
  const list = rows as TabVettore[];
  return list[0] ?? null;
}

export async function insertTabVettore(input: TabVettoreInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const cod = Number(input.Cod_Vettore);
  if (!Number.isFinite(cod)) {
    return { ok: false, error: 'Cod_Vettore non valido' };
  }

  try {
    await pool.execute(
      `INSERT INTO tab_vettori (
        \`Cod_Vettore\`, \`Descr_Vettore\`, \`Tipo_Vettore\`, \`Azienda_Vettore\`,
        \`Nome_Vettore\`, \`Cognome_Vettore\`, \`Cellulare_Vettore\`, \`Email_Vettore\`,
        \`Data_Modifica\`, \`Targa_Mezzo\`, \`Id_Tariffa\`, \`Attivo\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        cod,
        input.Descr_Vettore ?? null,
        input.Tipo_Vettore ?? null,
        input.Azienda_Vettore ?? null,
        input.Nome_Vettore ?? null,
        input.Cognome_Vettore ?? null,
        input.Cellulare_Vettore ?? null,
        input.Email_Vettore ?? null,
        input.Targa_Mezzo ?? null,
        input.Id_Tariffa ?? '2',
        toAttivo(input.Attivo),
      ]
    );
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Errore inserimento';
    if (String(msg).includes('Duplicate') || String(msg).includes('duplicate')) {
      return { ok: false, error: 'Esiste già un vettore con questo Cod_Vettore' };
    }
    return { ok: false, error: msg };
  }
}

export async function updateTabVettore(
  codVettoreOld: string,
  input: Partial<TabVettoreInput> & { Cod_Vettore?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const oldCod = parseCodVettore(codVettoreOld);
  if (oldCod === null) return { ok: false, error: 'Codice vettore non valido' };

  const newCod =
    input.Cod_Vettore !== undefined && input.Cod_Vettore !== null
      ? Number(input.Cod_Vettore)
      : oldCod;
  if (!Number.isFinite(newCod)) {
    return { ok: false, error: 'Nuovo Cod_Vettore non valido' };
  }

  try {
    if (newCod !== oldCod) {
      const [dup] = await pool.query(
        'SELECT 1 FROM tab_vettori WHERE `Cod_Vettore` = ? LIMIT 1',
        [newCod]
      );
      if ((dup as unknown[]).length > 0) {
        return { ok: false, error: 'Il nuovo Cod_Vettore è già in uso' };
      }
    }

    await pool.execute(
      `UPDATE tab_vettori SET
        \`Cod_Vettore\` = ?,
        \`Descr_Vettore\` = ?,
        \`Tipo_Vettore\` = ?,
        \`Azienda_Vettore\` = ?,
        \`Nome_Vettore\` = ?,
        \`Cognome_Vettore\` = ?,
        \`Cellulare_Vettore\` = ?,
        \`Email_Vettore\` = ?,
        \`Data_Modifica\` = NOW(),
        \`Targa_Mezzo\` = ?,
        \`Id_Tariffa\` = ?,
        \`Attivo\` = ?
      WHERE \`Cod_Vettore\` = ?`,
      [
        newCod,
        input.Descr_Vettore ?? null,
        input.Tipo_Vettore ?? null,
        input.Azienda_Vettore ?? null,
        input.Nome_Vettore ?? null,
        input.Cognome_Vettore ?? null,
        input.Cellulare_Vettore ?? null,
        input.Email_Vettore ?? null,
        input.Targa_Mezzo ?? null,
        input.Id_Tariffa ?? '2',
        toAttivo(input.Attivo),
        oldCod,
      ]
    );
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Errore aggiornamento';
    return { ok: false, error: msg };
  }
}
