import mysql from 'mysql2/promise';

// Configurazione connessione database per autenticazione
// Utilizza il database viaggi_db
// Pool piccolo: su Vercel ogni istanza ha un pool; keepAlive tiene connessioni vive e satura MySQL/ngrok.
const pool = mysql.createPool({
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'viaggi_db',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 3),
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: false,
  dateStrings: true,
  multipleStatements: false,
});

export default pool;