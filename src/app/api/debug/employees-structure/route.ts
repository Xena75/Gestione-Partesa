import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const connection = await getConnection();
    
    try {
      // Leggi la struttura della tabella employees
      const [columns] = await connection.execute(
        `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          COLUMN_TYPE,
          COLUMN_KEY,
          EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'employees'
        ORDER BY ORDINAL_POSITION`,
        [process.env.DB_VIAGGI_NAME || 'viaggi_db']
      );
      
      // Leggi anche qualche record di esempio
      const [sampleRows] = await connection.execute(
        'SELECT * FROM employees LIMIT 1'
      );
      
      return NextResponse.json({
        success: true,
        table: 'employees',
        columns: columns,
        sampleRecord: sampleRows && (sampleRows as any[]).length > 0 ? (sampleRows as any[])[0] : null,
        totalColumns: (columns as any[]).length
      });
      
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    console.error('Errore nel recupero struttura tabella:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      },
      { status: 500 }
    );
  }
}

