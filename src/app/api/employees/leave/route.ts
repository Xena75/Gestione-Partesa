// src/app/api/employees/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getEmployeeLeaveRequests, 
  createLeaveRequest, 
  getPendingLeaveRequests,
  getAllLeaveRequests,
  LeaveRequest 
} from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    console.log('API leave requests GET chiamata');
    
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    
    let leaveRequests: any[];
    
    if (employeeId) {
      // Richieste per un dipendente specifico
      leaveRequests = await getEmployeeLeaveRequests(employeeId);
    } else if (status === 'pending') {
      // Richieste in attesa di approvazione
      leaveRequests = await getPendingLeaveRequests();
    } else {
      // Tutte le richieste ferie
      leaveRequests = await getAllLeaveRequests();
    }
    
    console.log('Richieste ferie recuperate:', leaveRequests.length);
    
    return NextResponse.json({
      success: true,
      data: leaveRequests,
      message: 'Richieste ferie recuperate con successo'
    });
    
  } catch (error) {
    console.error('Errore API leave requests GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero delle richieste ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API leave requests POST chiamata');
    
    const body = await request.json();
    
    // Validazione dati base
    if (!body.employee_id || !body.leave_type || !body.start_date || !body.end_date || !body.days_requested) {
      return NextResponse.json({
        success: false,
        error: 'employee_id, leave_type, start_date, end_date e days_requested sono obbligatori'
      }, { status: 400 });
    }
    
    // Validazione tipo ferie
    const validTypes = ['ferie', 'permesso', 'malattia', 'congedo'];
    if (!validTypes.includes(body.leave_type)) {
      return NextResponse.json({
        success: false,
        error: 'Tipo ferie non valido'
      }, { status: 400 });
    }
    
    // Validazione date
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    
    if (startDate >= endDate) {
      return NextResponse.json({
        success: false,
        error: 'La data di fine deve essere successiva alla data di inizio'
      }, { status: 400 });
    }
    
    // Validazione giorni richiesti
    if (body.days_requested <= 0) {
      return NextResponse.json({
        success: false,
        error: 'I giorni richiesti devono essere maggiori di zero'
      }, { status: 400 });
    }
    
    // Prepara i dati della richiesta
    const leaveRequestData: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'> = {
      employee_id: body.employee_id,
      leave_type: body.leave_type,
      start_date: body.start_date,
      end_date: body.end_date,
      days_requested: body.days_requested,
      reason: body.reason || null,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      notes: body.notes || null
    };
    
    const requestId = await createLeaveRequest(leaveRequestData);
    
    console.log('Richiesta ferie creata con successo:', requestId);
    
    return NextResponse.json({
      success: true,
      data: { id: requestId },
      message: 'Richiesta ferie creata con successo'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Errore API leave requests POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nella creazione della richiesta ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}