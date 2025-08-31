// src/lib/db-partenze.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST,
  port: Number(process.env.DB_VIAGGI_PORT), // <-- Aggiunta la porta
  user: process.env.DB_VIAGGI_USER,
  password: process.env.DB_VIAGGI_PASS,
  database: process.env.DB_VIAGGI_NAME
});

export default pool;