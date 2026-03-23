import pool from '@/lib/db-gestione';

interface ImportProgress {
  progress: number;
  currentStep: string;
  completed: boolean;
  result?: {
    success: boolean;
    totalRows: number;
    importedRows: number;
    errors: string[];
    sessionId: string;
    duration: number;
  };
}

export async function updateImportProgress(
  fileId: string,
  progress: number,
  step: string,
  completed = false,
  result?: ImportProgress['result']
) {
  console.log(`📊 Aggiornamento progresso DB ${fileId}: ${progress}% - ${step} - Completato: ${completed}`);

  try {
    const query = `
        INSERT INTO import_progress (file_id, progress, current_step, completed, result)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          progress = VALUES(progress),
          current_step = VALUES(current_step),
          completed = VALUES(completed),
          result = VALUES(result),
          updated_at = CURRENT_TIMESTAMP
      `;

    const resultJson = result ? JSON.stringify(result) : null;

    await pool.execute(query, [fileId, progress, step, completed, resultJson]);

    console.log(`✅ Progresso aggiornato nel database per ${fileId}`);
  } catch (error) {
    console.error(`❌ Errore aggiornamento progresso DB per ${fileId}:`, error);
  }
}

export async function getImportProgress(fileId: string): Promise<ImportProgress | null> {
  console.log(`🔍 Recupero progresso DB per fileId: ${fileId}`);

  try {
    const [rows] = await pool.execute(
      'SELECT progress, current_step, completed, result FROM import_progress WHERE file_id = ?',
      [fileId]
    );

    const result = rows as any[];

    if (result.length === 0) {
      console.log(`❌ Progresso non trovato nel database per fileId: ${fileId}`);
      return null;
    }

    const row = result[0];
    const progress: ImportProgress = {
      progress: row.progress,
      currentStep: row.current_step,
      completed: row.completed,
      result: row.result ? JSON.parse(row.result) : undefined
    };

    console.log(`✅ Progresso recuperato dal database per ${fileId}:`, {
      progress: progress.progress,
      completed: progress.completed,
      currentStep: progress.currentStep
    });

    return progress;
  } catch (error) {
    console.error(`❌ Errore recupero progresso DB per ${fileId}:`, error);
    return null;
  }
}

export async function cleanupImportProgress(fileId: string) {
  console.log(`🧹 Cleanup progresso DB per ${fileId}`);
  setTimeout(async () => {
    try {
      await pool.execute('DELETE FROM import_progress WHERE file_id = ?', [fileId]);
      console.log(`🧹 Progresso ${fileId} pulito dal database`);
    } catch (error) {
      console.error(`❌ Errore cleanup progresso DB per ${fileId}:`, error);
    }
  }, 300000);
}

export async function cleanupOldProgress() {
  try {
    await pool.execute(
      'DELETE FROM import_progress WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );
    console.log('🧹 Progressi vecchi puliti dal database');
  } catch (error) {
    console.error('❌ Errore cleanup progressi vecchi:', error);
  }
}
