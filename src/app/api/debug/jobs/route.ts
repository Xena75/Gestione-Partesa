import { NextRequest, NextResponse } from 'next/server';
import { BackupDatabase } from '@/lib/db-backup';
import type { RowDataPacket, FieldPacket } from 'mysql2/promise';

// GET: Debug endpoint per visualizzare i job di backup
export async function GET(request: NextRequest) {
  try {
    const jobs = await BackupDatabase.getBackupJobs(20);

    return NextResponse.json({
      success: true,
      jobs,
      count: jobs.length
    });

  } catch (error) {
    console.error('❌ Errore debug jobs:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}