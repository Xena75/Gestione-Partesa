const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configurazione database backup_management
const backupDbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backup_management',
  charset: 'utf8mb4'
};

async function inspectAndCleanupDatabase() {
  let connection;
  const report = {
    removedJobs: [],
    removedAlerts: [],
    removedLogs: [],
    errors: []
  };

  try {
    console.log('🔍 Connecting to backup_management database...');
    connection = await mysql.createConnection(backupDbConfig);
    console.log('✅ Connected successfully');

    // Prima ispeziona la struttura delle tabelle
    console.log('\n📋 Inspecting table structures...');
    
    const tables = ['backup_jobs', 'backup_alerts', 'backup_activity_log', 'backup_schedules'];
    
    for (const table of tables) {
      try {
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`\n🔍 Table: ${table}`);
        columns.forEach(col => {
          console.log(`  - ${col.Field} (${col.Type})`);
        });
      } catch (error) {
        console.log(`  ❌ Table ${table} not found or error: ${error.message}`);
      }
    }

    // Ora pulisci i record basandoti sui campi esistenti
    console.log('\n🧹 Starting cleanup based on actual table structure...');
    
    // 1. Pulisci backup_jobs con status failed/error
    try {
      const [failedJobs] = await connection.execute(
        "SELECT * FROM backup_jobs WHERE status IN ('failed', 'error', 'cancelled')"
      );
      
      console.log(`\nFound ${failedJobs.length} failed/error jobs`);
      
      for (const job of failedJobs) {
        await connection.execute('DELETE FROM backup_jobs WHERE id = ?', [job.id]);
        report.removedJobs.push({
          id: job.id,
          uuid: job.job_uuid || job.uuid || 'unknown',
          status: job.status,
          reason: `failed status: ${job.status}`
        });
        console.log(`  ❌ Removed failed job ${job.id} (status: ${job.status})`);
      }
    } catch (error) {
      console.log(`  ⚠️ Error cleaning backup_jobs: ${error.message}`);
      report.errors.push(`backup_jobs: ${error.message}`);
    }

    // 2. Pulisci backup_alerts per job non esistenti (se la tabella esiste)
    try {
      const [orphanedAlerts] = await connection.execute(`
        SELECT ba.* 
        FROM backup_alerts ba 
        LEFT JOIN backup_jobs bj ON (ba.job_uuid = bj.job_uuid OR ba.job_uuid = bj.uuid)
        WHERE bj.id IS NULL
      `);
      
      console.log(`\nFound ${orphanedAlerts.length} orphaned alerts`);
      
      for (const alert of orphanedAlerts) {
        await connection.execute('DELETE FROM backup_alerts WHERE id = ?', [alert.id]);
        report.removedAlerts.push({
          id: alert.id,
          job_uuid: alert.job_uuid,
          alert_type: alert.alert_type || alert.type,
          message: alert.message
        });
        console.log(`  ❌ Removed orphaned alert ${alert.id}`);
      }
    } catch (error) {
      console.log(`  ⚠️ Error cleaning backup_alerts: ${error.message}`);
      report.errors.push(`backup_alerts: ${error.message}`);
    }

    // 3. Pulisci backup_activity_log per job non esistenti (se la tabella esiste)
    try {
      const [orphanedLogs] = await connection.execute(`
        SELECT bal.* 
        FROM backup_activity_log bal 
        LEFT JOIN backup_jobs bj ON (bal.job_uuid = bj.job_uuid OR bal.job_uuid = bj.uuid)
        WHERE bj.id IS NULL
      `);
      
      console.log(`\nFound ${orphanedLogs.length} orphaned logs`);
      
      for (const log of orphanedLogs) {
        await connection.execute('DELETE FROM backup_activity_log WHERE id = ?', [log.id]);
        report.removedLogs.push({
          id: log.id,
          job_uuid: log.job_uuid,
          activity_type: log.activity_type || log.type,
          message: log.message
        });
        console.log(`  ❌ Removed orphaned log ${log.id}`);
      }
    } catch (error) {
      console.log(`  ⚠️ Error cleaning backup_activity_log: ${error.message}`);
      report.errors.push(`backup_activity_log: ${error.message}`);
    }

    console.log('\n📊 Cleanup Report:');
    console.log(`  - Removed ${report.removedJobs.length} backup jobs`);
    console.log(`  - Removed ${report.removedAlerts.length} orphaned alerts`);
    console.log(`  - Removed ${report.removedLogs.length} orphaned logs`);
    console.log(`  - Errors encountered: ${report.errors.length}`);
    
    if (report.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    report.errors.push(error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }

  return report;
}

inspectAndCleanupDatabase().then(report => {
  console.log('\n🎉 Cleanup completed!');
}).catch(error => {
  console.error('💥 Cleanup failed:', error);
});