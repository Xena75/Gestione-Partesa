// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, Employee } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    console.log('API employees GET chiamata');
    
    // Estrai parametri di query
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    
    let employees;
    
    if (companyId) {
      // Filtra per società specifica
      const companyIdNum = parseInt(companyId);
      if (isNaN(companyIdNum)) {
        return NextResponse.json({
          success: false,
          error: 'ID società non valido'
        }, { status: 400 });
      }
      
      // Importa la funzione per filtrare per società
      const { getEmployeesByCompany } = await import('@/lib/db-employees');
      employees = await getEmployeesByCompany(companyIdNum);
    } else {
      // Recupera tutti i dipendenti
      employees = await getAllEmployees();
    }
    
    console.log('Dipendenti recuperati con successo:', employees.length);
    
    return NextResponse.json({
      success: true,
      data: employees,
      message: 'Dipendenti recuperati con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei dipendenti',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API employees POST chiamata');
    
    const body = await request.json();
    
    // Validazione dati base
    if (!body.nome || !body.cognome || !body.email) {
      return NextResponse.json({
        success: false,
        error: 'Nome, cognome ed email sono obbligatori'
      }, { status: 400 });
    }
    
    // Prepara i dati del dipendente
    const employeeData: any = {
      nome: body.nome,
      cognome: body.cognome,
      email: body.email,
      email_aziendale: body.email_aziendale || undefined,
      cellulare: body.cellulare || undefined,
      data_nascita: body.data_nascita || undefined,
      luogo_nascita: body.luogo_nascita || undefined,
      codice_fiscale: body.cod_fiscale || body.codice_fiscale || undefined, // Supporta entrambi i nomi
      cittadinanza: body.cittadinanza || undefined,
      permesso_soggiorno: body.permesso_soggiorno || undefined,
      titolo_studio: body.titolo_studio || undefined,
      indirizzo: body.indirizzo || undefined,
      citta: body.citta || undefined,
      cap: body.cap || undefined,
      cdc: body.cdc || undefined,
      qualifica: body.qualifica || undefined,
      tipo_contratto: body.tipo_contratto || undefined,
      ccnl: body.ccnl || undefined,
      livello: body.livello || undefined,
      orario_lavoro: body.orario_lavoro || undefined,
      data_assunzione: body.data_assunzione || undefined,
      data_dimissioni: body.data_dimissioni || undefined,
      patente: body.patente || undefined,
      foto_url: body.foto_url || undefined,
      username_login: body.username_login || undefined,
      is_driver: body.is_driver !== undefined ? body.is_driver : (body.qualifica?.toUpperCase().trim() === 'AUTISTA'),
      active: body.active !== undefined ? body.active : true,
      company_id: body.company_id || 1 // Default alla prima società se non specificato
    };
    
    const employeeId = await createEmployee(employeeData);
    
    console.log('Dipendente creato con successo:', employeeId);
    
    return NextResponse.json({
      success: true,
      data: { id: employeeId },
      message: 'Dipendente creato con successo'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Errore API employees POST:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nella creazione del dipendente',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}