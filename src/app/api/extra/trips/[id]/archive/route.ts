import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getTripById, setTripArchived } from '@/lib/data-extra';

export async function PATCH(
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
    if (typeof body.archived !== 'boolean') {
      return NextResponse.json({ success: false, error: 'archived boolean obbligatorio' }, { status: 400 });
    }
    if (body.version == null || !Number.isFinite(Number(body.version))) {
      return NextResponse.json({ success: false, error: 'version obbligatoria' }, { status: 400 });
    }

    const result = await setTripArchived(id, body.archived, Number(body.version), auth.user.id);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, current: result.current || null },
        { status: result.status || 400 }
      );
    }
    const data = await getTripById(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PATCH /api/extra/trips/[id]/archive:', error);
    return NextResponse.json({ success: false, error: 'Errore archiviazione' }, { status: 500 });
  }
}
