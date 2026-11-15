import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getTripSummary, type CostType, type ExtraTripFilters } from '@/lib/data-extra';

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
    };

    const data = await getTripSummary(filters);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/extra/summary:', error);
    return NextResponse.json({ success: false, error: 'Errore riepilogo' }, { status: 500 });
  }
}
