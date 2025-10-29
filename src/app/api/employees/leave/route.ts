import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { 
  getEmployeeLeaveRequests, 
  createLeaveRequest, 
  LeaveRequest,
  getEmployeeById,
  getEmployeeByUsername,
  getPendingLeaveRequests,
  getAllLeaveRequests
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
      targetUserId = userCheck.user.username;
    }
    
    // Se non c'è user_id ma c'è status=pending, recupera tutte le richieste pendenti
    if (!targetUserId && status === 'pending') {
      console.log('Recupero tutte le richieste ferie pendenti per la dashboard');
      const pendingRequests = await getPendingLeaveRequests();
      
      console.log(`Recuperate ${pendingRequests.length} richieste ferie pendenti totali`);
      
      return NextResponse.json({
        success: true,
        data: pendingRequests,
        message: 'Richieste ferie pendenti recuperate con successo'
      });
    }
    
    // Se non ci sono parametri user_id e status, restituisci tutte le richieste ferie
    if (!targetUserId && !status) {
      console.log('Recupero tutte le richieste ferie (nessun parametro specificato)');
      const allRequests = await getAllLeaveRequests();
      
      console.log(`Recuperate ${allRequests.length} richieste ferie totali`);
      
      return NextResponse.json({
        success: true,
        data: allRequests,
        message: 'Tutte le richieste ferie recuperate con successo'
      });
    }
    
    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'ID utente non fornito'
      }, { status: 400 });
    }
    
    console.log('Recupero richieste ferie per dipendente ID:', targetUserId);
    
    // Trova il dipendente usando getEmployeeByUsername (ora cerca in più campi)
    const employee = await getEmployeeByUsername(targetUserId);
    
    if (!employee) {
      console.error('ERRORE: Dipendente non trovato per username:', targetUserId);
      console.log('Tentativo di ricerca diretta per ID...');
      
      // Fallback: prova a cercare direttamente per ID
      const employeeById = await getEmployeeById(targetUserId);
      if (!employeeById) {
        console.error('ERRORE: Dipendente non trovato neanche per ID:', targetUserId);
        return NextResponse.json({
          success: false,
          error: 'Dipendente non trovato. Verificare che l\'utente sia registrato nella tabella employees.'
        }, { status: 404 });
      }
      
      console.log('Dipendente trovato tramite ricerca per ID:', employeeById.nome, employeeById.cognome);
      // Usa il dipendente trovato per ID
      const leaveRequestsById = await getEmployeeLeaveRequests(employeeById.id, status || undefined);
      
      let filteredRequestsById = leaveRequestsById;
      if (limit) {
        const limitNum = parseInt(limit);
        filteredRequestsById = leaveRequestsById.slice(0, limitNum);
      }
      
      filteredRequestsById.sort((a, b) => {
        const dateA = new Date(a.created_at || a.start_date);
        const dateB = new Date(b.created_at || b.start_date);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`Recuperate ${filteredRequestsById.length} richieste ferie per dipendente ${targetUserId} (tramite ID)`);
      
      return NextResponse.json({
        success: true,
        data: filteredRequestsById,
        message: 'Richieste ferie recuperate con successo'
      });
    }
    
    console.log('Recuperate richieste ferie per dipendente:', employee.nome, employee.cognome);
    
    // Recupera le richieste ferie del dipendente usando l'ID corretto
    const leaveRequests = await getEmployeeLeaveRequests(employee.id, status || undefined);
    
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

// Funzione per calcolare i giorni lavorativi
function calculateWorkingDays(startDateStr: string, endDateStr: string): number {
  // Converte formato italiano gg/mm/aaaa in Date
  const parseItalianDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    // Se è già in formato ISO (yyyy-mm-dd), convertilo direttamente
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    
    // Se è in formato italiano (gg/mm/aaaa)
    if (dateStr.length === 10 && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;
      
      return new Date(year, month - 1, day);
    }
    
    // Prova a parsare come data standard
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const startDate = parseItalianDate(startDateStr);
  const endDate = parseItalianDate(endDateStr);
  
  if (!startDate || !endDate || endDate < startDate) {
    return 0;
  }

  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Domenica, 6 = Sabato - escludiamo weekend
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
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
    const { user_id, start_date, end_date, leave_type, reason, notes, days_requested, hours_requested } = body;
    
    // Se l'utente è employee, può creare richieste solo per se stesso
    let targetUserId = user_id;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.username;
    }
    
    if (!targetUserId || !start_date || !end_date || !leave_type) {
      return NextResponse.json({
        success: false,
        error: 'Dati mancanti: user_id, start_date, end_date e leave_type sono obbligatori'
      }, { status: 400 });
    }

    // Validazione specifica per permessi ad ore
    if (leave_type === 'permesso') {
      // Per i permessi, se ci sono ore, i giorni devono essere 0
      if (hours_requested && hours_requested > 0) {
        if (days_requested && days_requested !== 0) {
          return NextResponse.json({
            success: false,
            error: 'Per i permessi ad ore, il campo giorni richiesti deve essere 0'
          }, { status: 400 });
        }
      } else if (!days_requested || days_requested <= 0) {
        return NextResponse.json({
          success: false,
          error: 'Per i permessi è obbligatorio specificare ore o giorni'
        }, { status: 400 });
      }
    } else {
      // Per ferie, malattia, congedo: i giorni devono essere > 0
      if (!days_requested || days_requested <= 0) {
        return NextResponse.json({
          success: false,
          error: 'Per ferie, malattia e congedo il campo giorni richiesti deve essere maggiore di 0'
        }, { status: 400 });
      }
    }
    
    console.log('POST - Creazione richiesta ferie per dipendente ID:', targetUserId);
    
    // Verifica che il dipendente esista prima di creare la richiesta
    let employee = await getEmployeeByUsername(targetUserId);
    if (!employee) {
      console.log('POST - Dipendente non trovato per username, provo per ID:', targetUserId);
      employee = await getEmployeeById(targetUserId);
    }
    
    if (!employee) {
      console.error('POST - ERRORE: Dipendente non trovato per:', targetUserId);
      return NextResponse.json({
        success: false,
        error: 'Dipendente non trovato. Verificare che l\'utente sia registrato nella tabella employees.'
      }, { status: 404 });
    }
    
    console.log('POST - Dipendente trovato:', employee.nome, employee.cognome, 'ID:', employee.id);
    
    // Calcola automaticamente i giorni lavorativi se non forniti
    let calculatedDays = days_requested;
    
    // Per i permessi ad ore, i giorni devono essere 0
    if (leave_type === 'permesso' && hours_requested && hours_requested > 0) {
      calculatedDays = 0;
    } else if (!calculatedDays || calculatedDays <= 0) {
      calculatedDays = calculateWorkingDays(start_date, end_date);
    }
    
    console.log('POST - Giorni calcolati:', calculatedDays);
    console.log('POST - Dati ricevuti dal form:', {
      user_id,
      start_date,
      end_date,
      leave_type,
      reason,
      notes,
      days_requested
    });
    
    // Non convertiamo le date in oggetti Date, lasciamole come stringhe
    // La funzione createLeaveRequest si occuperà della conversione
    const leaveData: Partial<LeaveRequest> = {
      employee_id: employee.id, // Usa l'ID del dipendente trovato
      start_date: start_date, // Mantieni come stringa
      end_date: end_date, // Mantieni come stringa
      days_requested: calculatedDays,
      hours_requested: hours_requested || null,
      leave_type,
      reason: reason || null,
      notes: notes || null,
      status: 'pending',
      approved_by: null,
      approved_at: null
    };
    
    console.log('POST - Dati preparati per createLeaveRequest:', leaveData);
    
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