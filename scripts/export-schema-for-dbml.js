/**
 * Export schema SQL per conversione in DBML (dbdiagram.io)
 * Usa la connessione da .env.local - nessun mysqldump esterno richiesto
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Carica .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).replace(/^['"]|['"]$/g, '').trim();
        process.env[key] = val;
      }
    }
  });
}

const dbConfigs = [
  {
    name: 'gestionelogistica',
    host: process.env.DB_GESTIONE_HOST || 'localhost',
    port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
    user: process.env.DB_GESTIONE_USER || 'root',
    password: process.env.DB_GESTIONE_PASS || '',
    database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  },
  {
    name: 'viaggi_db',
    host: process.env.DB_VIAGGI_HOST || 'localhost',
    port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
    user: process.env.DB_VIAGGI_USER || 'root',
    password: process.env.DB_VIAGGI_PASS || '',
    database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  },
];

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportSchemaCsv(config) {
  const { name, ...connConfig } = config;
  const conn = await mysql.createConnection(connConfig);
  const [rows] = await conn.execute(
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [config.database]
  );
  await conn.end();
  const header = 'table,column,type,nullable,key,default';
  const lines = [header, ...rows.map(r => [
    r.TABLE_NAME,
    r.COLUMN_NAME,
    r.COLUMN_TYPE || r.DATA_TYPE,
    r.IS_NULLABLE,
    r.COLUMN_KEY || '',
    r.COLUMN_DEFAULT || '',
  ].map(escapeCsv).join(','))];
  return lines.join('\n');
}

async function exportSchema(config) {
  const { name, ...connConfig } = config;
  const conn = await mysql.createConnection(connConfig);
  const [tables] = await conn.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [config.database]
  );
  const parts = [`-- Schema: ${config.database}\n`];
  for (const row of tables) {
    const [rows] = await conn.execute(`SHOW CREATE TABLE \`${row.TABLE_NAME}\``);
    parts.push(rows[0]['Create Table'] + ';\n\n');
  }
  await conn.end();
  return parts.join('');
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--csv');
  const dbArg = args[0] || 'all';
  const outDir = path.join(__dirname, '..');
  const format = process.argv.includes('--csv') ? 'csv' : 'dbml';
  for (const config of dbConfigs) {
    if (dbArg !== 'all' && dbArg !== config.name) continue;
    console.log(`📤 Export ${config.name}...`);
    try {
      if (format === 'csv') {
        const csv = await exportSchemaCsv(config);
        const csvPath = path.join(outDir, `${config.name}.csv`);
        fs.writeFileSync(csvPath, csv, 'utf8');
        console.log(`   ✅ ${config.name}.csv`);
        continue;
      }
      const sql = await exportSchema(config);
      const sqlPath = path.join(outDir, `${config.name}.sql`);
      fs.writeFileSync(sqlPath, sql, 'utf8');
      console.log(`   ✅ ${config.name}.sql`);

      // Preprocessa per sql2dbml (sintassi MariaDB non supportata)
      const sqlClean = sql
        .replace(/DEFAULT uuid\(\)/gi, '')
        .replace(/ ON UPDATE current_timestamp\(\)/gi, '')
        .replace(/ ON UPDATE CURRENT_TIMESTAMP\(\)/gi, '');
      const sqlCleanPath = path.join(outDir, `${config.name}_clean.sql`);
      fs.writeFileSync(sqlCleanPath, sqlClean, 'utf8');

      console.log(`   🔄 Conversione in DBML...`);
      const dbmlPath = path.join(outDir, config.name + '.dbml');
      try {
        execSync(`npx -p @dbml/cli sql2dbml "${sqlCleanPath}" --mysql -o "${dbmlPath}"`, {
          stdio: 'inherit',
          cwd: outDir,
          shell: true,
        });
        console.log(`   ✅ ${config.name}.dbml`);
      } catch (e) {
        console.log(`   ⚠️ sql2dbml fallito - usa il file .sql manualmente`);
      }
    } catch (err) {
      console.error(`   ❌ ${config.name}:`, err.message);
    }
  }
  console.log(format === 'csv'
    ? '\n📋 Importa i file .csv (Import from CSV in dbdiagram.io)'
    : '\n📋 Copia il contenuto dei file .dbml in dbdiagram.io');
}

main();
