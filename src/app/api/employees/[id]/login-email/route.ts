// src/app/api/employees/[id]/login-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateEmployee, getEmployeeById } from '@/lib/db-employees';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const decodedId = decodeURIComponent(resolvedParams.id);
    console.log('API login-email PUT chiamata per ID:', decodedId);
    
    const body = await request.json();
    const { login_email } = body;
    
    console.log('Nuovo login_email ricevuto:', login_email);
    
    // Validazione email se fornita
    if (login_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login_email)) {
      return NextResponse.json({
        success: false,
        error: 'Formato email non valido'
      }, { status: 400 });
    }
    
    // Verifica che il dipendente esista
    const employee = await getEmployeeById(decodedId);
    if (!employee) {
      return NextResponse.json({
        success: false,
        error: 'Dipendente non trovato'
      }, { status: 404 });
    }
    
    // Aggiorna solo il campo login_email
    const success = await updateEmployee(decodedId, { login_email });
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Errore nell\'aggiornamento dell\'email di accesso'
      }, { status: 500 });
    }
    
    console.log('Email di accesso aggiornata con successo per dipendente:', decodedId);
    
    return NextResponse.json({
      success: true,
      message: 'Email di accesso aggiornata con successo'
    });
    
  } catch (error) {
    console.error('Errore API login-email PUT:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nell\'aggiornamento dell\'email di accesso',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const decodedId = decodeURIComponent(resolvedParams.id);
    console.log('API login-email GET chiamata per ID:', decodedId);
    
    const employee = await getEmployeeById(decodedId);
    
    if (!employee) {
      return NextResponse.json({
        success: false,
        error: 'Dipendente non trovato'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        login_email: employee.login_email || null,
        has_login_email: !!employee.login_email
      },
      message: 'Email di accesso recuperata con successo'
    });
    
  } catch (error) {
    console.error('Errore API login-email GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dell\'email di accesso',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}