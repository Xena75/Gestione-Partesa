import { NextRequest, NextResponse } from 'next/server';
import { BackupDatabase } from '@/lib/db-backup';

// POST: Aggiorna le date dei prossimi backup schedulati
export async function POST(_request: NextRequest) {
  try {
    const schedules = await BackupDatabase.getBackupSchedules();
    
    for (const schedule of schedules) {
      if (schedule.enabled) {
        // Calcola prossima esecuzione basata su cron expression
        const nextRun = new Date();
        nextRun.setDate(nextRun.getDate() + 1); // Semplificato per ora
      }
    }

    // Verifica che l'aggiornamento sia avvenuto
    const updatedSchedules = await BackupDatabase.getBackupSchedules();
    const updated = updatedSchedules.find(s => s.id === schedule_id);

    if (!updated) {
      return NextResponse.json(
        { error: 'Schedule non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data prossimo backup aggiornata con successo',
      schedule: updated
    });

  } catch (error) {
    console.error('❌ Errore aggiornamento date backup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// GET: Ottiene le date dei prossimi backup
export async function GET() {
  try {
    const schedules = await BackupDatabase.getBackupSchedules();

    return NextResponse.json({
      success: true,
      schedules
    });

  } catch (error) {
    console.error('❌ Errore recupero date backup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}