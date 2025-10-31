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
    const employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'> = {
      nome: body.nome,
      cognome: body.cognome,
      email: body.email,
      cellulare: body.cellulare || undefined,
      data_nascita: body.data_nascita || undefined,
      codice_fiscale: body.codice_fiscale || undefined,
      indirizzo: body.indirizzo || undefined,
      citta: body.citta || undefined,
      cap: body.cap || undefined,
      provincia: body.provincia || undefined,
      data_assunzione: body.data_assunzione || undefined,
      contratto: body.contratto || undefined,
      stipendio: body.stipendio || undefined,
      ore_settimanali: body.ore_settimanali || undefined,
      ferie_annuali: body.ferie_annuali || 26,
      permessi_annuali: body.permessi_annuali || 32,
      is_driver: body.is_driver || false,
      driver_license_number: body.driver_license_number || undefined,
      driver_license_expiry: body.driver_license_expiry || undefined,
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