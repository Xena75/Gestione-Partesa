import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { importExtraExcelBuffer } from '@/lib/extra-import';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await verifyUserAccess(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json({ success: false, error: auth.message || 'Non autenticato' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const dryRun = String(form.get('dryRun') || '') === '1' || String(form.get('dryRun') || '') === 'true';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Campo file obbligatorio (multipart)' },
        { status: 400 }
      );
    }

    const name = file.name || 'extra-import.xlsx';
    if (!/\.xlsx?$/i.test(name)) {
      return NextResponse.json({ success: false, error: 'Solo file .xlsx/.xls' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ success: false, error: 'File vuoto' }, { status: 400 });
    }

    const report = await importExtraExcelBuffer({
      buffer,
      sourceFilename: name,
      userId: auth.user.id,
      dryRun,
    });

    const hasErrors = report.issues.some((i) => i.level === 'error');
    return NextResponse.json({
      success: !hasErrors || report.counts.tripsImported > 0 || report.skippedDuplicateBatch || dryRun,
      report,
    });
  } catch (error) {
    console.error('POST /api/extra/import:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore import',
      },
      { status: 500 }
    );
  }
}
