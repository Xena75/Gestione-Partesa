// src/lib/db-gestione.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_GESTIONE_HOST,
  port: Number(process.env.DB_GESTIONE_PORT), // <-- Aggiunta la porta
  user: process.env.DB_GESTIONE_USER,
  password: process.env.DB_GESTIONE_PASS,
  database: process.env.DB_GESTIONE_NAME
});

export default pool;