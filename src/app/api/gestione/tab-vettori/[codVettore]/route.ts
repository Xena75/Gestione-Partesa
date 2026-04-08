import { NextRequest, NextResponse } from 'next/server';
import { getTabVettoreByCod, updateTabVettore, type TabVettoreInput } from '@/lib/data-tab-vettori';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ codVettore: string }> }
) {
  try {
    const { codVettore } = await context.params;
    const row = await getTabVettoreByCod(codVettore);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Non trovato' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error('GET tab-vettori/[cod]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ codVettore: string }> }
) {
  try {
    const { codVettore } = await context.params;
    const body = (await request.json()) as Partial<TabVettoreInput> & Record<string, unknown>;

    const existing = await getTabVettoreByCod(codVettore);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Record non trovato' }, { status: 404 });
    }

    const merged: TabVettoreInput = {
      Cod_Vettore:
        body.Cod_Vettore !== undefined && body.Cod_Vettore !== null
          ? Number(body.Cod_Vettore)
          : existing.Cod_Vettore,
      Descr_Vettore:
        body.Descr_Vettore !== undefined ? (body.Descr_Vettore as string | null) : existing.Descr_Vettore,
      Tipo_Vettore:
        body.Tipo_Vettore !== undefined ? (body.Tipo_Vettore as string | null) : existing.Tipo_Vettore,
      Azienda_Vettore:
        body.Azienda_Vettore !== undefined
          ? (body.Azienda_Vettore as string | null)
          : existing.Azienda_Vettore,
      Nome_Vettore:
        body.Nome_Vettore !== undefined ? (body.Nome_Vettore as string | null) : existing.Nome_Vettore,
      Cognome_Vettore:
        body.Cognome_Vettore !== undefined
          ? (body.Cognome_Vettore as string | null)
          : existing.Cognome_Vettore,
      Cellulare_Vettore:
        body.Cellulare_Vettore !== undefined
          ? (body.Cellulare_Vettore as string | null)
          : existing.Cellulare_Vettore,
      Email_Vettore:
        body.Email_Vettore !== undefined ? (body.Email_Vettore as string | null) : existing.Email_Vettore,
      Targa_Mezzo:
        body.Targa_Mezzo !== undefined ? (body.Targa_Mezzo as string | null) : existing.Targa_Mezzo,
      Id_Tariffa:
        body.Id_Tariffa !== undefined ? (body.Id_Tariffa as string | null) : existing.Id_Tariffa,
    };

    const result = await updateTabVettore(codVettore, merged);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Salvato' });
  } catch (error) {
    console.error('PUT tab-vettori/[cod]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
