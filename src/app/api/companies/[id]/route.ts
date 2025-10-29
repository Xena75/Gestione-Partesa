import { NextRequest, NextResponse } from 'next/server';
import { getCompanyById, updateCompany, deleteCompany, getEmployeesByCompany } from '@/lib/db-employees';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id);
    
    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: 'ID società non valido' },
        { status: 400 }
      );
    }

    const company = await getCompanyById(companyId);
    
    if (!company) {
      return NextResponse.json(
        { error: 'Società non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Errore nel recupero della società:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della società' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id);
    
    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: 'ID società non valido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validazione campi obbligatori
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: 'Nome e codice sono obbligatori' },
        { status: 400 }
      );
    }

    // Validazione lunghezza campi
    if (body.name.length > 255) {
      return NextResponse.json(
        { error: 'Il nome non può superare i 255 caratteri' },
        { status: 400 }
      );
    }

    if (body.code.length > 50) {
      return NextResponse.json(
        { error: 'Il codice non può superare i 50 caratteri' },
        { status: 400 }
      );
    }

    // Validazione email se fornita
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      );
    }

    const updatedCompany = await updateCompany(companyId, body);
    
    if (!updatedCompany) {
      return NextResponse.json(
        { error: 'Società non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCompany);
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento della società:', error);
    
    // Gestione errore codice duplicato
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Una società con questo codice esiste già' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della società' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id);
    
    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: 'ID società non valido' },
        { status: 400 }
      );
    }

    // Verifica se la società ha dipendenti
    const employees = await getEmployeesByCompany(companyId);
    
    if (employees.length > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare la società: ha dipendenti associati' },
        { status: 409 }
      );
    }

    const deleted = await deleteCompany(companyId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Società non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Società eliminata con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione della società:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione della società' },
      { status: 500 }
    );
  }
}