import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getEmployeeLeaveBalance, getEmployeeById, getEmployeeByUsername, createOrUpdateLeaveBalance } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // Se l'utente è employee, può vedere solo il proprio bilancio
    let targetUserId = userId;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.username;
    }
    
    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'ID utente non fornito'
      }, { status: 400 });
    }
    
    console.log('Recupero bilancio ferie per dipendente ID:', targetUserId);
    
    // Cerca il dipendente prima per ID, poi per username
    let employee = await getEmployeeById(targetUserId);
    if (!employee) {
      employee = await getEmployeeByUsername(targetUserId);
    }
    
    if (!employee) {
      return NextResponse.json({
        success: false,
        error: `Dipendente con ID/username '${targetUserId}' non trovato nella tabella employees`
      }, { status: 404 });
    }
    
    // Recupera il bilancio ferie del dipendente usando l'ID corretto
    let leaveBalance = await getEmployeeLeaveBalance(employee.id);
    
    // Se il bilancio non esiste, crealo automaticamente con valori standard
    if (!leaveBalance) {
      const currentYear = new Date().getFullYear();
      console.log(`Bilancio ferie non trovato per ${employee.nome} ${employee.cognome} (${employee.id}) per l'anno ${currentYear}. Creazione automatica...`);
      
      const newBalance = {
        employee_id: employee.id,
        year: currentYear,
        vacation_days_total: 26,
        vacation_days_used: 0,
        vacation_days_remaining: 26,
        sick_days_used: 0,
        personal_days_used: 0
      };
      
      const created = await createOrUpdateLeaveBalance(newBalance);
      if (created) {
        // Ricarica il bilancio appena creato
        leaveBalance = await getEmployeeLeaveBalance(employee.id);
        console.log(`Bilancio ferie creato automaticamente per ${employee.nome} ${employee.cognome}`);
      } else {
        console.error(`Errore nella creazione del bilancio ferie per ${employee.nome} ${employee.cognome}`);
        return NextResponse.json({
          success: false,
          error: `Errore nella creazione automatica del bilancio ferie per ${employee.nome} ${employee.cognome}`
        }, { status: 500 });
      }
    }
    
    console.log(`Bilancio ferie recuperato per dipendente ${targetUserId}:`, leaveBalance);
    
    return NextResponse.json({
      success: true,
      data: leaveBalance,
      message: 'Bilancio ferie recuperato con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees/leave/balance GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero del bilancio ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}