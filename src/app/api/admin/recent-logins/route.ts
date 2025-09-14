import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth';
import pool from '@/lib/db-auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica accesso admin
    const adminCheck = await verifyAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.message }, { status: 403 });
    }

    console.log('API recent-logins chiamata da admin:', adminCheck.user?.username);

    // Parametri di paginazione
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = (page - 1) * limit;

    try {
      // Query per contare il totale degli accessi recenti
      const countQuery = `
        SELECT COUNT(*) as total
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;

      // Query per recuperare gli accessi recenti con paginazione
      const dataQuery = `
        SELECT 
          u.username,
          u.email,
          u.role,
          s.created_at as login_time
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Esegui entrambe le query
      const [countResult] = await pool.execute(countQuery);
      const [dataResult] = await pool.execute(dataQuery, [limit, offset]);
      
      const total = (countResult as any[])[0].total;
      const totalPages = Math.ceil(total / limit);
      
      console.log(`Accessi recenti - Pagina ${page}/${totalPages}, Totale: ${total}`);
      
      return NextResponse.json({ 
        success: true, 
        data: dataResult,
        total: total,
        page: page,
        limit: limit,
        totalPages: totalPages
      });

    } catch (dbError) {
      console.error('Errore database:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Errore nel recupero accessi recenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}