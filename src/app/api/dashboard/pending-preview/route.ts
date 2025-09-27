import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';
import { verifyUserAccess } from '@/lib/auth';

interface PendingViaggio {
  'Numero Viaggio': string;
  'Nominativo': string;
  'Data Inizio': string;
  'Deposito': string;
  'Targa': string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// GET - Recupera anteprima viaggi pending con paginazione
export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per accedere ai dati' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Query per contare il totale dei viaggi pending
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM viaggi 
       WHERE stato = 'pending'`
    );
    const totalItems = (countResult as any[])[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Query per recuperare i viaggi pending con paginazione
    const [viaggiResult] = await pool.execute(
      `SELECT 
         numero_viaggio as 'Numero Viaggio',
         nominativo as 'Nominativo',
         DATE_FORMAT(data_inizio, '%d/%m/%Y') as 'Data Inizio',
         deposito as 'Deposito',
         targa as 'Targa'
       FROM viaggi 
       WHERE stato = 'pending'
       ORDER BY data_inizio DESC, numero_viaggio DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const viaggi = viaggiResult as PendingViaggio[];

    const pagination: PaginationInfo = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit
    };

    return NextResponse.json({
      success: true,
      viaggi,
      pagination
    });

  } catch (error) {
    console.error('Errore nel recupero viaggi pending:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server nel recupero viaggi pending',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}