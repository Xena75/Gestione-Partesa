import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { deleteTrip, getTripById, updateTrip } from '@/lib/data-extra';

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
    const data = await getTripById(id);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Non trovato' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/extra/trips/[id]:', error);
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
    const result = await updateTrip(id, body, auth.user.id);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, current: result.current || null },
        { status: result.status || 400 }
      );
    }
    const data = await getTripById(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PUT /api/extra/trips/[id]:', error);
    return NextResponse.json({ success: false, error: 'Errore aggiornamento' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const result = await deleteTrip(id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/extra/trips/[id]:', error);
    return NextResponse.json({ success: false, error: 'Errore eliminazione' }, { status: 500 });
  }
}
