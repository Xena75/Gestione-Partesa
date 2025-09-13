import mysql from 'mysql2/promise';

// Configurazione connessione database per autenticazione
// Utilizza il database gestionelogistica esistente
const pool = mysql.createPool({
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  multipleStatements: false
});

export default pool;