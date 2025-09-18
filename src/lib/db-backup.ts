// Configurazione database MySQL per sistema backup
import mysql from 'mysql2/promise';

// Configurazione connessione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Pool di connessioni per il database backup
const backupPool = mysql.createPool({
  ...backupDbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Interfacce TypeScript per le tabelle backup
export interface BackupJob {
  id: string;
  database_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  start_time: Date;
  end_time?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  error_message?: string;
  encrypted: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface BackupFile {
  id: string;
  backup_job_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  checksum_md5: string;
  encrypted: boolean;
  storage_location: 'local' | 'cloud' | 'network';
  created_at: Date;
}

export interface BackupLog {
  id: string;
  backup_job_id: string;
  log_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  details?: string;
  timestamp: Date;
}

export interface BackupSchedule {
  id: string;
  database_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  cron_expression: string;
  enabled: boolean;
  retention_days: number;
  last_run?: Date;
  next_run?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface BackupConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  updated_at: Date;
  updated_by: string;
}

// Funzioni helper per gestione database backup
export class BackupDatabase {
  
  // Ottieni tutti i job backup
  static async getBackupJobs(limit: number = 50): Promise<BackupJob[]> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows as BackupJob[];
  }

  // Ottieni job backup per database
  static async getBackupJobsByDatabase(database: string): Promise<BackupJob[]> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_jobs WHERE database_name = ? ORDER BY created_at DESC',
      [database]
    );
    return rows as BackupJob[];
  }

  // Crea nuovo job backup
  static async createBackupJob(job: Partial<BackupJob>): Promise<string> {
    const [result] = await backupPool.execute(
      `INSERT INTO backup_jobs (database_name, backup_type, status, created_by) 
       VALUES (?, ?, ?, ?)`,
      [job.database_name, job.backup_type, job.status || 'queued', job.created_by || 'system']
    );
    return (result as any).insertId;
  }

  // Aggiorna stato job backup
  static async updateBackupJob(id: string, updates: Partial<BackupJob>): Promise<void> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await backupPool.execute(
      `UPDATE backup_jobs SET ${fields} WHERE id = ?`,
      [...values, id]
    );
  }

  // Ottieni configurazioni backup
  static async getBackupConfigs(): Promise<BackupConfig[]> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_configs ORDER BY config_key'
    );
    return rows as BackupConfig[];
  }

  // Ottieni configurazione specifica
  static async getBackupConfig(key: string): Promise<BackupConfig | null> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_configs WHERE config_key = ?',
      [key]
    );
    const configs = rows as BackupConfig[];
    return configs.length > 0 ? configs[0] : null;
  }

  // Ottieni scheduling backup
  static async getBackupSchedules(): Promise<BackupSchedule[]> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_schedules ORDER BY database_name, backup_type'
    );
    return rows as BackupSchedule[];
  }

  // Ottieni file backup per job
  static async getBackupFiles(jobId: string): Promise<BackupFile[]> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_files WHERE backup_job_id = ? ORDER BY created_at',
      [jobId]
    );
    return rows as BackupFile[];
  }

  // Aggiungi file backup
  static async addBackupFile(file: Partial<BackupFile>): Promise<string> {
    const [result] = await backupPool.execute(
      `INSERT INTO backup_files (backup_job_id, file_path, file_name, file_size, checksum_md5, encrypted, storage_location) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        file.backup_job_id, 
        file.file_path, 
        file.file_name, 
        file.file_size || 0, 
        file.checksum_md5 || '', 
        file.encrypted || false, 
        file.storage_location || 'local'
      ]
    );
    return (result as any).insertId;
  }

  // Aggiungi log backup
  static async addBackupLog(log: Partial<BackupLog>): Promise<void> {
    await backupPool.execute(
      `INSERT INTO backup_logs (backup_job_id, log_level, message, details) 
       VALUES (?, ?, ?, ?)`,
      [log.backup_job_id, log.log_level || 'INFO', log.message, log.details]
    );
  }

  // Ottieni log backup per job
  static async getBackupLogs(jobId: string): Promise<BackupLog[]> {
    const [rows] = await backupPool.execute(
      'SELECT * FROM backup_logs WHERE backup_job_id = ? ORDER BY timestamp DESC',
      [jobId]
    );
    return rows as BackupLog[];
  }

  // Ottieni statistiche backup
  static async getBackupStats() {
    const [jobStats] = await backupPool.execute(`
      SELECT 
        database_name,
        backup_type,
        status,
        COUNT(*) as count,
        MAX(created_at) as last_backup
      FROM backup_jobs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY database_name, backup_type, status
    `);

    const [sizeStats] = await backupPool.execute(`
      SELECT 
        bj.database_name,
        SUM(bf.file_size) as total_size,
        COUNT(bf.id) as file_count
      FROM backup_jobs bj
      JOIN backup_files bf ON bj.id = bf.backup_job_id
      WHERE bj.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY bj.database_name
    `);

    return {
      jobStats: jobStats as any[],
      sizeStats: sizeStats as any[]
    };
  }

  // Test connessione database
  static async testConnection(): Promise<boolean> {
    try {
      const [rows] = await backupPool.execute('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Errore connessione database backup:', error);
      return false;
    }
  }

  // Chiudi pool connessioni
  static async closePool(): Promise<void> {
    await backupPool.end();
  }
}

// Funzioni utility per formattazione
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (start: Date, end?: Date): string => {
  const endTime = end || new Date();
  const duration = endTime.getTime() - start.getTime();
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'text-green-600';
    case 'running': return 'text-blue-600';
    case 'failed': return 'text-red-600';
    case 'queued': return 'text-yellow-600';
    case 'cancelled': return 'text-gray-600';
    default: return 'text-gray-500';
  }
};

export default backupPool;