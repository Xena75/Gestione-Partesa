/**
 * Variabili per script backup (.bat / register-backup.js) allineate a .env.local:
 * DB_GESTIONE_*, DB_VIAGGI_*, MYSQL_* (backup_management).
 * Next.js carica .env.local in process.env in sviluppo; in produzione usare le stesse chiavi su Vercel/host che lancia i .bat.
 * SSL cloud: default --ssl-mode=REQUIRED (MySQL 8.4+). Client vecchi: BACKUP_MYSQLDUMP_SSL_ARGS=--ssl o altro.
 */

function stripQuotes(v: string | undefined): string {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

/** Variabili da passare allo spawn(cmd) che esegue i .bat in backup-system/scripts */
export function buildBackupChildProcessEnv(): Record<string, string> {
  const host =
    stripQuotes(
      process.env.DB_GESTIONE_HOST || process.env.DB_VIAGGI_HOST || process.env.MYSQL_HOST
    ) || 'localhost';
  const port =
    stripQuotes(
      process.env.DB_GESTIONE_PORT || process.env.DB_VIAGGI_PORT || process.env.MYSQL_PORT
    ) || '3306';
  const user =
    stripQuotes(
      process.env.DB_GESTIONE_USER || process.env.DB_VIAGGI_USER || process.env.MYSQL_USER
    ) || 'root';
  const password = stripQuotes(
    process.env.DB_GESTIONE_PASS ||
      process.env.DB_VIAGGI_PASS ||
      process.env.MYSQL_PASSWORD
  );
  const dbViaggi = stripQuotes(process.env.DB_VIAGGI_NAME) || 'viaggi_db';
  const dbGestione = stripQuotes(process.env.DB_GESTIONE_NAME) || 'gestionelogistica';

  const sslExplicit =
    process.env.BACKUP_MYSQL_SSL === '1' || process.env.BACKUP_MYSQL_SSL === 'true';
  const sslByPort = port === '25060';
  const sslCustom = stripQuotes(process.env.BACKUP_MYSQLDUMP_SSL_ARGS);
  const sslArgs =
    sslCustom !== ''
      ? sslCustom
      : sslExplicit || sslByPort
        ? '--ssl-mode=REQUIRED'
        : '';

  const mysqlBin =
    stripQuotes(process.env.MYSQL_BIN) ||
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin';

  return {
    MYSQL_HOST: host,
    MYSQL_PORT: port,
    MYSQL_USER: user,
    MYSQL_PASSWORD: password,
    DB_VIAGGI_NAME: dbViaggi,
    DB_GESTIONE_NAME: dbGestione,
    MYSQLDUMP_EXTRA_ARGS: sslArgs,
    MYSQL_CLIENT_EXTRA_ARGS: sslArgs,
    MYSQL_BIN: mysqlBin
  };
}
