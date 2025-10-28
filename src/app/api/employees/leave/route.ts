import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { 
  getEmployeeLeaveRequests, 
  createLeaveRequest, 
  LeaveRequest 
} from '@/lib/db-employees';

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
    const limit = searchParams.get('limit');
    const status = searchParams.get('status');
    
    // Se l'utente è employee, può vedere solo le proprie richieste
    let targetUserId = userId;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.id;
    }
    
    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'ID utente non fornito'
      }, { status: 400 });
    }
    
    console.log('Recupero richieste ferie per dipendente ID:', targetUserId);
    
    // Recupera le richieste ferie del dipendente
    const leaveRequests = await getEmployeeLeaveRequests(targetUserId, status || undefined);
    
    // Applica limite se specificato
    let filteredRequests = leaveRequests;
    if (limit) {
      const limitNum = parseInt(limit);
      filteredRequests = leaveRequests.slice(0, limitNum);
    }
    
    // Ordina per data di richiesta (più recenti prima)
    filteredRequests.sort((a, b) => {
      const dateA = new Date(a.created_at || a.start_date);
      const dateB = new Date(b.created_at || b.start_date);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`Recuperate ${filteredRequests.length} richieste ferie per dipendente ${targetUserId}`);
    
    return NextResponse.json({
      success: true,
      data: filteredRequests,
      message: 'Richieste ferie recuperate con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees/leave GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero delle richieste ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, start_date, end_date, leave_type, reason, notes } = body;
    
    // Se l'utente è employee, può creare richieste solo per se stesso
    let targetUserId = user_id;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.id;
    }
    
    if (!targetUserId || !start_date || !end_date || !leave_type) {
      return NextResponse.json({
        success: false,
        error: 'Dati mancanti: user_id, start_date, end_date e leave_type sono obbligatori'
      }, { status: 400 });
    }
    
    const leaveData: Partial<LeaveRequest> = {
      employee_id: targetUserId,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      leave_type,
      reason,
      notes,
      status: 'pending'
    };
    
    const newLeaveRequest = await createLeaveRequest(leaveData);
    
    return NextResponse.json({
      success: true,
      data: newLeaveRequest,
      message: 'Richiesta ferie creata con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees/leave POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nella creazione della richiesta ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}