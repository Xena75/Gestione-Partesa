import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getTerzistiData, getTerzistiStats, TerzistiFilters } from '@/lib/data-terzisti';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, includeStats = true, includeVettoreAnalysis = true } = body;

    // Validazione filtri
    const validFilters: TerzistiFilters = {
      divisione: filters?.divisione || undefined,
      vettore: filters?.vettore || undefined,
      azienda: filters?.azienda || undefined,
      dataDa: filters?.dataDa || undefined,
      dataA: filters?.dataA || undefined,
      viaggio: filters?.viaggio || undefined,
      cliente: filters?.cliente || undefined,
      mese: filters?.mese || undefined
    };

    // Recupera i dati filtrati
    const [dataResult, statsResult] = await Promise.all([
      getTerzistiData(validFilters, { field: 'data_viaggio', order: 'DESC' }, 1, 20000), // Limite alto per export completo (20k record)
      includeStats ? getTerzistiStats(validFilters) : null
    ]);

    const { data } = dataResult;
    const stats = statsResult;

    // Crea workbook Excel
    const workbook = XLSX.utils.book_new();

    // Funzione per formattare date in formato europeo
    const formatDateEuropean = (dateString: string) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      } catch {
        return dateString;
      }
    };

    // Foglio 1: Dati Filtati (TUTTI I CAMPI)
    const dataSheet = XLSX.utils.json_to_sheet(data.map(record => ({
      'ID': record.id,
      'Divisione': record.div,
      'BU': record.bu,
      'Deposito': record.dep,
      'Data Movimento Merce': formatDateEuropean(record.data_mov_merce),
      'Data Viaggio': formatDateEuropean(record.data_viaggio),
      'Viaggio': record.viaggio,
      'Ordine': record.ordine,
      'Consegna': record.consegna_num,
      'Cod_Vettore': Number(record.Cod_Vettore) || 0,
      'Vettore': record.descr_vettore,
      'Descr_Vettore_Join': record.Descr_Vettore_Join,
      'Tipo_Vettore': record.Tipo_Vettore,
      'Azienda_Vettore': record.Azienda_Vettore,
      'Tipologia': record.tipologia,
      'Cod_Articolo': record.cod_articolo,
      'Descrizione_Articolo': record.descr_articolo,
      'Colli': Number(record.colli) || 0,
      'Compenso': Number(record.compenso) || 0,
      'Extra_Cons': Number(record.extra_cons) || 0,
      'Tot_Compenso': Number(record.tot_compenso) || 0,
      'Cod_Cliente': record.cod_cliente,
      'Cliente': record.ragione_sociale,
      'ID_fatt': record.ID_fatt,
      'Classe_Prod': record.classe_prod,
      'Classe_Tariffa': record.classe_tariffa,
      'Id_Tariffa': record.Id_Tariffa,
      'Tariffa_Terzista': Number(record.tariffa_terzista) || 0,
      'Created_At': formatDateEuropean(record.created_at),
      'Updated_At': formatDateEuropean(record.updated_at)
    })));

    // Stile intestazioni
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center" }
    };

    // Applica stile alle intestazioni
    const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!dataSheet[cellAddress]) continue;
      dataSheet[cellAddress].s = headerStyle;
    }

    // Imposta larghezza colonne per tutti i campi
    dataSheet['!cols'] = [
      { wch: 8 },   // ID
      { wch: 8 },   // Divisione
      { wch: 10 },  // BU
      { wch: 10 },  // Deposito
      { wch: 15 },  // Data Movimento Merce
      { wch: 12 },  // Data Viaggio
      { wch: 10 },  // Viaggio
      { wch: 12 },  // Ordine
      { wch: 12 },  // Consegna
      { wch: 12 },  // Cod_Vettore
      { wch: 20 },  // Vettore
      { wch: 20 },  // Descr_Vettore_Join
      { wch: 12 },  // Tipo_Vettore
      { wch: 25 },  // Azienda_Vettore
      { wch: 15 },  // Tipologia
      { wch: 15 },  // Cod_Articolo
      { wch: 30 },  // Descrizione_Articolo
      { wch: 8 },   // Colli
      { wch: 12 },  // Compenso
      { wch: 10 },  // Extra_Cons
      { wch: 12 },  // Tot_Compenso
      { wch: 12 },  // Cod_Cliente
      { wch: 25 },  // Cliente
      { wch: 20 },  // ID_fatt
      { wch: 12 },  // Classe_Prod
      { wch: 12 },  // Classe_Tariffa
      { wch: 12 },  // Id_Tariffa
      { wch: 12 },  // Tariffa_Terzista
      { wch: 20 },  // Created_At
      { wch: 20 }   // Updated_At
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Dati Filtati');

    // Foglio 2: Statistiche Generali (se richieste)
    if (includeStats && stats) {
      const statsData = [
        ['METRICA', 'VALORE'],
        ['Totale Consegne', stats.totalConsegne],
        ['Totale Viaggi', stats.totalViaggi],
        ['Totale Colli', stats.totalColli],
        ['Totale Compenso', `€ ${Number(stats.totalCompenso).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`],
        ['Totale Fatturato', `€ ${Number(stats.totalFatturato).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`],
        ['Totale Extra', `€ ${Number(stats.totalExtra).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`],
        ['N° Aziende', stats.uniqueAziende],
        ['N° Vettori', stats.uniqueVettori],
        ['Media Colli/Consegna', Number(stats.mediaColliConsegna).toLocaleString('it-IT', { minimumFractionDigits: 2 })],
        ['Media Colli/Viaggio', Number(stats.mediaColliViaggio).toLocaleString('it-IT', { minimumFractionDigits: 2 })],
        ['Media Compenso/Consegna', `€ ${Number(stats.mediaFatturatoViaggio).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`],
        ['Media Compenso/Viaggio', `€ ${Number(stats.mediaCompensoViaggio).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`]
      ];

      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      
      // Stile intestazioni statistiche
      statsSheet['A1'].s = headerStyle;
      statsSheet['B1'].s = headerStyle;
      
      // Larghezza colonne
      statsSheet['!cols'] = [
        { wch: 25 }, // Metrica
        { wch: 20 }  // Valore
      ];

      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiche');
    }

    // Foglio 3: Analisi per Vettore (se richiesta)
    if (includeVettoreAnalysis && data.length > 0) {
      // Raggruppa per vettore
      const vettoreStats = new Map();
      
      data.forEach(record => {
        const vettore = record.descr_vettore;
        if (!vettoreStats.has(vettore)) {
          vettoreStats.set(vettore, {
            vettore,
            azienda: record.Azienda_Vettore,
            consegne: new Set(),
            viaggi: new Set(),
            colli: 0,
            compenso: 0,
            extra: 0,
            totCompenso: 0
          });
        }
        
        const stats = vettoreStats.get(vettore);
        stats.consegne.add(record.consegna_num);
        stats.viaggi.add(record.viaggio);
        stats.colli += Number(record.colli) || 0;
        stats.compenso += Number(record.compenso) || 0;
        stats.extra += Number(record.extra_cons) || 0;
        stats.totCompenso += Number(record.tot_compenso) || 0;
      });

      // Converte in array per Excel
      const vettoreData = Array.from(vettoreStats.values()).map(stats => {
        const numColli = Number(stats.colli) || 0;
        const numCompenso = Number(stats.compenso) || 0;
        const numTotCompenso = Number(stats.totCompenso) || 0;
        const numViaggi = stats.viaggi.size;
        
        return {
          'Vettore': stats.vettore,
          'Azienda': stats.azienda,
          'Consegne': stats.consegne.size,
          'Viaggi': numViaggi,
          'Colli': numColli,
          'Compenso': numCompenso,
          'Extra': Number(stats.extra) || 0,
          'Tot. Compenso': numTotCompenso,
          'Media Colli/Viaggio': numViaggi > 0 ? (numColli / numViaggi).toFixed(2) : '0.00',
          'Media Compenso/Viaggio': numViaggi > 0 ? (numCompenso / numViaggi).toFixed(2) : '0.00'
        };
      });

      // Ordina per compenso decrescente
      vettoreData.sort((a, b) => b['Tot. Compenso'] - a['Tot. Compenso']);

      const vettoreSheet = XLSX.utils.json_to_sheet(vettoreData);
      
      // Stile intestazioni
      const range = XLSX.utils.decode_range(vettoreSheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!vettoreSheet[cellAddress]) continue;
        vettoreSheet[cellAddress].s = headerStyle;
      }

      // Larghezza colonne
      vettoreSheet['!cols'] = [
        { wch: 20 }, // Vettore
        { wch: 25 }, // Azienda
        { wch: 10 }, // Consegne
        { wch: 8 },  // Viaggi
        { wch: 8 },  // Colli
        { wch: 12 }, // Compenso
        { wch: 8 },  // Extra
        { wch: 12 }, // Tot. Compenso
        { wch: 15 }, // Media Colli/Viaggio
        { wch: 18 }  // Media Compenso/Viaggio
      ];

      XLSX.utils.book_append_sheet(workbook, vettoreSheet, 'Analisi per Vettore');
    }


    // Genera buffer Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    // Crea nome file con timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `Fatturazione_Terzisti_${timestamp}.xlsx`;

    // Ritorna file Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Errore export Excel terzisti:', error);
    return NextResponse.json(
      { error: 'Errore durante la generazione del file Excel' },
      { status: 500 }
    );
  }
}
