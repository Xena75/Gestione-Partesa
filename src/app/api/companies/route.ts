import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, createCompany } from '@/lib/db-employees';

export async function GET() {
  try {
    const companies = await getAllCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Errore nel recupero delle società:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle società' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const newCompany = await createCompany(body);
    return NextResponse.json(newCompany, { status: 201 });
  } catch (error: any) {
    console.error('Errore nella creazione della società:', error);
    
    // Gestione errore codice duplicato
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Una società con questo codice esiste già' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore nella creazione della società' },
      { status: 500 }
    );
  }
}