import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getBeneficiary, updateBeneficiary } from '@/lib/data-extra';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const data = await getBeneficiary(id);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Non trovato' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/extra/beneficiaries/[id]:', error);
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateBeneficiary(id, body, auth.user.id);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }
    const data = await getBeneficiary(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT /api/extra/beneficiaries/[id]:', error);
    return NextResponse.json({ success: false, error: 'Errore aggiornamento' }, { status: 500 });
  }
}
