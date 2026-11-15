import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import {
  createBeneficiary,
  listBeneficiaries,
  type BeneficiaryKind,
} from '@/lib/data-extra';

export async function GET(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const kind = (searchParams.get('kind') || 'all') as BeneficiaryKind | 'all';
    const active = (searchParams.get('active') || '1') as '0' | '1' | 'all';
    const search = searchParams.get('search') || undefined;
    const data = await listBeneficiaries({ kind, active, search });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/extra/beneficiaries:', error);
    return NextResponse.json({ success: false, error: 'Errore nel caricamento' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createBeneficiary(body, auth.user.id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/extra/beneficiaries:', error);
    return NextResponse.json({ success: false, error: 'Errore nella creazione' }, { status: 500 });
  }
}
