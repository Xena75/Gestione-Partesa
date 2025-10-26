// src/app/api/employees/leave/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllLeaveRequests } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    console.log('API leave calendar GET chiamata');
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const employeeId = searchParams.get('employee_id');
    
    // Recupera tutte le richieste ferie approvate
    const allLeaveRequests = await getAllLeaveRequests();
    
    // Filtra solo le ferie approvate
    let approvedLeaves = allLeaveRequests.filter(leave => leave.status === 'approved');
    
    // Filtra per dipendente specifico se richiesto
    if (employeeId) {
      approvedLeaves = approvedLeaves.filter(leave => leave.employee_id.toString() === employeeId);
    }
    
    // Filtra per range di date se specificato
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      approvedLeaves = approvedLeaves.filter(leave => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        
        // Include se c'è sovrapposizione con il range richiesto
        return leaveStart <= end && leaveEnd >= start;
      });
    }
    
    // Converte le ferie in formato eventi calendario
    const calendarEvents = approvedLeaves.map(leave => {
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      
      // Per eventi multi-giorno, aggiungi un giorno alla fine per includere l'ultimo giorno
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
      
      return {
        id: `leave-${leave.id}`,
        title: `${leave.cognome} ${leave.nome} - ${getLeaveTypeLabel(leave.leave_type)}`,
        start: startDate.toISOString(),
        end: adjustedEndDate.toISOString(),
        allDay: true,
        resource: {
          type: 'leave',
          leave_id: leave.id,
          employee_id: leave.employee_id,
          employee_name: `${leave.cognome} ${leave.nome}`,
          leave_type: leave.leave_type,
          days_requested: leave.days_requested,
          reason: leave.reason,
          approved_by: leave.approved_by,
          approved_at: leave.approved_at,
          notes: leave.notes
        }
      };
    });
    
    console.log(`Recuperati ${calendarEvents.length} eventi ferie per il calendario`);
    
    return NextResponse.json({
      success: true,
      data: calendarEvents,
      message: 'Eventi ferie recuperati con successo'
    });
    
  } catch (error) {
    console.error('Errore API leave calendar GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero degli eventi ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

// Funzione helper per convertire il tipo ferie in etichetta leggibile
function getLeaveTypeLabel(leaveType: string): string {
  const typeLabels: { [key: string]: string } = {
    'ferie': 'Ferie',
    'permesso': 'Permesso',
    'malattia': 'Malattia',
    'congedo': 'Congedo'
  };
  
  return typeLabels[leaveType] || leaveType;
}