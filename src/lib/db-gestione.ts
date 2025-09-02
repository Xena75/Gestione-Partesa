// src/lib/db-gestione.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: Number(process.env.DB_GESTIONE_PORT) || 3306,
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  // 🚀 OTTIMIZZAZIONI PERFORMANCE
  waitForConnections: true,
  connectionLimit: 20, // Aumentato per gestire più richieste simultanee
  queueLimit: 0,
  acquireTimeout: 30000, // Timeout ridotto per evitare blocchi
  timeout: 30000, // Timeout ridotto per evitare blocchi
  dateStrings: true, // Mantiene le date come stringhe
  // 🚀 NUOVE OPZIONI PER PERFORMANCE
  multipleStatements: false, // Sicurezza
  charset: 'utf8mb4',
  // 🚀 OTTIMIZZAZIONI CONNECTION POOL
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

export default pool;