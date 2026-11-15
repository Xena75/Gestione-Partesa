import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getCadHocByBeneficiary, type ExtraTripFilters } from '@/lib/data-extra';

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
      search: sp.get('search') || undefined,
      beneficiaryId: sp.get('beneficiaryId') || undefined,
    };
    const data = await getCadHocByBeneficiary(filters);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/extra/cad-hoc-summary:', error);
    return NextResponse.json({ success: false, error: 'Errore riepilogo cad-hoc' }, { status: 500 });
  }
}