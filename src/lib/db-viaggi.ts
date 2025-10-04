// src/lib/db-partenze.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST,
  port: Number(process.env.DB_VIAGGI_PORT), // <-- Aggiunta la porta
  user: process.env.DB_VIAGGI_USER,
  password: process.env.DB_VIAGGI_PASSWORD,
  database: process.env.DB_VIAGGI_NAME,
  dateStrings: true, // <-- Forza mysql2 a restituire le date come stringhe
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

export default pool;