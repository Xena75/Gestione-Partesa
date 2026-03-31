// src/lib/db-partenze.ts
import mysql from 'mysql2/promise';

/**
 * TLS per MySQL gestito in cloud: DB_VIAGGI_SSL=true
 * DigitalOcean (e altri) usano catene non nel trust store locale → default rejectUnauthorized=false.
 * In produzione con CA nota: DB_VIAGGI_SSL_REJECT_UNAUTHORIZED=true
 */
function buildSsl(): { rejectUnauthorized: boolean } | undefined {
  const raw = (process.env.DB_VIAGGI_SSL || '').trim().toLowerCase();
  if (!raw || raw === '0' || raw === 'false' || raw === 'off') {
    return undefined;
  }
  if (['1', 'true', 'yes', 'required', 'on'].includes(raw)) {
    const rejectUnauthorized =
      process.env.DB_VIAGGI_SSL_REJECT_UNAUTHORIZED === 'true';
    return { rejectUnauthorized };
  }
  return undefined;
}

const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: Number(process.env.DB_VIAGGI_PORT) || 3306,
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  ssl: buildSsl(),
  dateStrings: true, // <-- Forza mysql2 a restituire le date come stringhe
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;