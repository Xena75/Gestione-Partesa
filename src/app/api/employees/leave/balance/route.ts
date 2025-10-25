// src/app/api/employees/leave/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getEmployeeLeaveBalance, 
  createOrUpdateLeaveBalance,
  LeaveBalance 
} from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    console.log('API leave balance GET chiamata');
    
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const yearParam = searchParams.get('year');
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'employee_id è obbligatorio'
      }, { status: 400 });
    }
    
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    if (isNaN(year) || year < 2020 || year > 2030) {
      return NextResponse.json({
        success: false,
        error: 'Anno non valido'
      }, { status: 400 });
    }
    
    const balance = await getEmployeeLeaveBalance(employeeId, year);
    
    if (!balance) {
      return NextResponse.json({
        success: false,
        error: 'Bilancio ferie non trovato per questo dipendente e anno'
      }, { status: 404 });
    }
    
    console.log('Bilancio ferie recuperato con successo:', balance.id);
    
    return NextResponse.json({
      success: true,
      data: balance,
      message: 'Bilancio ferie recuperato con successo'
    });
    
  } catch (error) {
    console.error('Errore API leave balance GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero del bilancio ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API leave balance POST chiamata');
    
    const body = await request.json();
    
    // Validazione dati base
    if (!body.employee_id || !body.year) {
      return NextResponse.json({
        success: false,
        error: 'employee_id e year sono obbligatori'
      }, { status: 400 });
    }
    
    // Validazione anno
    if (body.year < 2020 || body.year > 2030) {
      return NextResponse.json({
        success: false,
        error: 'Anno non valido'
      }, { status: 400 });
    }
    
    // Prepara i dati del bilancio
    const balanceData: Omit<LeaveBalance, 'id' | 'created_at' | 'last_updated'> = {
      employee_id: body.employee_id,
      year: body.year,
      vacation_days_total: body.vacation_days_total || 26,
      vacation_days_used: body.vacation_days_used || 0,
      vacation_days_remaining: body.vacation_days_remaining || body.vacation_days_total || 26,
      sick_days_used: body.sick_days_used || 0,
      personal_days_used: body.personal_days_used || 0
    };
    
    // Validazione logica
    if (balanceData.vacation_days_used > balanceData.vacation_days_total) {
      return NextResponse.json({
        success: false,
        error: 'I giorni di ferie utilizzati non possono superare il totale'
      }, { status: 400 });
    }
    
    if (balanceData.vacation_days_remaining !== (balanceData.vacation_days_total - balanceData.vacation_days_used)) {
      balanceData.vacation_days_remaining = balanceData.vacation_days_total - balanceData.vacation_days_used;
    }
    
    const success = await createOrUpdateLeaveBalance(balanceData);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Errore nella creazione/aggiornamento del bilancio'
      }, { status: 500 });
    }
    
    console.log('Bilancio ferie creato/aggiornato con successo');
    
    return NextResponse.json({
      success: true,
      message: 'Bilancio ferie creato/aggiornato con successo'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Errore API leave balance POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nella creazione/aggiornamento del bilancio ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}