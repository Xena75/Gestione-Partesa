import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db-employees';

interface DocumentWithEmployee {
  id: number;
  employee_id: string;
  employee_name: string;
  nome: string;
  cognome: string;
  document_type: string;
  file_name: string;
  file_path: string;
  expiry_date: string | null;
  upload_date: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  days_until_expiry: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const connection = await getConnection();
    
    try {
      // Prima aggiorna lo status dei documenti
      await connection.execute(`
        UPDATE employee_documents 
        SET status = CASE 
          WHEN expiry_date IS NULL THEN 'valido'
          WHEN expiry_date < CURDATE() THEN 'scaduto'
          WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'in_scadenza'
          ELSE 'valido'
        END
      `);

      // Recupera tutti i documenti con informazioni sui dipendenti
      const [rows] = await connection.execute(`
        SELECT 
          ed.*,
          e.nome,
          e.cognome,
          CONCAT(e.nome, ' ', e.cognome) as employee_name,
          CASE 
            WHEN ed.expiry_date IS NULL THEN NULL
            WHEN ed.expiry_date < CURDATE() THEN DATEDIFF(CURDATE(), ed.expiry_date) * -1
            ELSE DATEDIFF(ed.expiry_date, CURDATE())
          END as days_until_expiry
        FROM employee_documents ed
        JOIN employees e ON ed.employee_id = e.id
        WHERE e.active = 1
        ORDER BY 
          CASE ed.status 
            WHEN 'scaduto' THEN 1 
            WHEN 'in_scadenza' THEN 2 
            WHEN 'valido' THEN 3 
            ELSE 4 
          END,
          ed.expiry_date ASC,
          e.cognome, e.nome
      `);

      const documents = rows as DocumentWithEmployee[];

      return NextResponse.json({
        success: true,
        data: documents,
        count: documents.length
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero di tutti i documenti:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}