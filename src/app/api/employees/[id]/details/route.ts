// src/app/api/employees/[id]/details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-employees';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const decodedId = decodeURIComponent(resolvedParams.id);
    console.log('API employee details GET chiamata per ID:', decodedId);
    
    const connection = await pool.getConnection();
    
    try {
      // Query ottimizzata che recupera tutti i dati in una sola chiamata
      const [employeeRows] = await connection.execute(
        `SELECT e.*, c.name as company_name 
         FROM employees e 
         LEFT JOIN companies c ON e.company_id = c.id 
         WHERE e.id = ?`,
        [decodedId]
      );
      
      const employees = employeeRows as any[];
      if (employees.length === 0) {
        // Prova con username se non trova per ID
        const [usernameRows] = await connection.execute(
          `SELECT e.*, c.name as company_name 
           FROM employees e 
           LEFT JOIN companies c ON e.company_id = c.id 
           WHERE e.username_login = ?`,
          [decodedId]
        );
        
        const usernameEmployees = usernameRows as any[];
        if (usernameEmployees.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Dipendente non trovato'
          }, { status: 404 });
        }
        employees.push(usernameEmployees[0]);
      }
      
      const employee = employees[0];
      const employeeId = employee.id;
      
      // Recupera documenti
      const [documentsRows] = await connection.execute(
        'SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY created_at DESC',
        [employeeId]
      );
      
      // Recupera bilancio ferie per l'anno corrente
      const currentYear = new Date().getFullYear();
      const [leaveBalanceRows] = await connection.execute(
        `SELECT * FROM employee_leave_balance
         WHERE employee_id = ? AND year = ?
         ORDER BY month DESC LIMIT 1`,
        [employeeId, currentYear]
      );
      
      // Recupera richieste ferie
      const [leaveRequestsRows] = await connection.execute(
        `SELECT * FROM employee_leave_requests 
         WHERE employee_id = ? 
         ORDER BY created_at DESC`,
        [employeeId]
      );
      
      console.log('Dati dipendente recuperati con successo:', employee.nome, employee.cognome);
      
      return NextResponse.json({
        success: true,
        data: {
          employee: employee,
          documents: documentsRows || [],
          leaveBalance: leaveBalanceRows && Array.isArray(leaveBalanceRows) && leaveBalanceRows.length > 0 ? leaveBalanceRows[0] : null,
          leaveRequests: leaveRequestsRows || []
        },
        message: 'Dati dipendente recuperati con successo'
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Errore API employee details GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei dati del dipendente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}