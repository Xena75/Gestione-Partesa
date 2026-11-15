import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { createTrip, listTrips, type CostType, type ExtraTripFilters } from '@/lib/data-extra';

export async function GET(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const sp = new URL(request.url).searchParams;
    const filters: ExtraTripFilters = {
      dataDa: sp.get('dataDa') || undefined,
      dataA: sp.get('dataA') || undefined,
      archived: (sp.get('archived') as ExtraTripFilters['archived']) || 'all',
      isExtra: (sp.get('isExtra') as ExtraTripFilters['isExtra']) || 'all',
      amountPresence: (sp.get('amountPresence') as ExtraTripFilters['amountPresence']) || 'all',
      search: sp.get('search') || undefined,
      carrierCod: sp.get('carrierCod') ? Number(sp.get('carrierCod')) : undefined,
      costType: (sp.get('costType') as CostType | 'all') || 'all',
      hasCadHoc: (sp.get('hasCadHoc') as ExtraTripFilters['hasCadHoc']) || 'all',
      beneficiaryId: sp.get('beneficiaryId') || undefined,
      page: Number(sp.get('page')) || 1,
      pageSize: Number(sp.get('pageSize')) || 25,
      sortBy: (sp.get('sortBy') as ExtraTripFilters['sortBy']) || 'trip_date',
      sortOrder: sp.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC',
    };

    const result = await listTrips(filters);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('GET /api/extra/trips:', error);
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
    const result = await createTrip(body, auth.user.id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/extra/trips:', error);
    return NextResponse.json({ success: false, error: 'Errore nella creazione' }, { status: 500 });
  }
}
