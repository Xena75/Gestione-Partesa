import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDeliveryStats, DeliveryFilters } from '@/lib/data-gestione';
import pool from '@/lib/db-gestione';

// 🚀 CONFIGURAZIONE: Aumenta limiti per export grandi dataset
export const maxDuration = 300; // 5 minuti timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, includeStats = true, includeVettoreAnalysis = true } = body;
    
    // 🚀 TIMEOUT: Limita il tempo di esecuzione per evitare blocchi
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Export timeout: troppi dati da processare')), 600000) // 10 minuti
    );
    
    

    const validFilters: DeliveryFilters = {
      divisione: filters?.divisione || undefined,
      vettore: filters?.vettore || undefined,
      tipologia: filters?.tipologia || undefined,
      dataDa: filters?.dataDa || undefined,
      dataA: filters?.dataA || undefined,
      viaggio: filters?.viaggio || undefined,
      cliente: filters?.cliente || undefined,
      codCliente: filters?.codCliente || undefined,
      deposito: filters?.deposito || undefined,
      bu: filters?.bu || undefined,
      ordine: filters?.ordine || undefined,
      mese: filters?.mese || undefined,
      anno: filters?.anno || undefined
    };

    // Funzione per recuperare TUTTI i record (non solo la prima pagina)
    const getAllDeliveryData = async (filters: DeliveryFilters) => {
      const conditions: string[] = [];
      const queryParams: any[] = [];

      if (filters) {
        if (filters.viaggio && filters.viaggio !== '' && filters.viaggio !== 'Tutti') {
          conditions.push('viaggio LIKE ?');
          queryParams.push(`%${filters.viaggio}%`);
        }
        if (filters.ordine && filters.ordine !== '' && filters.ordine !== 'Tutti') {
          conditions.push('ordine LIKE ?');
          queryParams.push(`%${filters.ordine}%`);
        }
        if (filters.bu && filters.bu !== 'Tutti' && filters.bu !== '') {
          conditions.push('bu = ?');
          queryParams.push(filters.bu);
        }
        if (filters.divisione && filters.divisione !== 'Tutte' && filters.divisione !== '') {
          conditions.push('`div` = ?');
          queryParams.push(filters.divisione);
        }
        if (filters.deposito && filters.deposito !== 'Tutti' && filters.deposito !== '') {
          conditions.push('dep = ?');
          queryParams.push(filters.deposito);
        }
        if (filters.vettore && filters.vettore !== 'Tutti' && filters.vettore !== '') {
          conditions.push('descr_vettore = ?');
          queryParams.push(filters.vettore);
        }
        if (filters.tipologia && filters.tipologia !== 'Tutte' && filters.tipologia !== '') {
          conditions.push('tipologia = ?');
          queryParams.push(filters.tipologia);
        }
        if (filters.codCliente && filters.codCliente !== '' && filters.codCliente !== 'Tutti') {
          conditions.push('cod_cliente LIKE ?');
          queryParams.push(`%${filters.codCliente}%`);
        }
        if (filters.cliente && filters.cliente !== '' && filters.cliente !== 'Tutti') {
          conditions.push('ragione_sociale LIKE ?');
          queryParams.push(`%${filters.cliente}%`);
        }
        if (filters.dataDa && filters.dataDa !== '') {
          conditions.push('data_mov_merce >= ?');
          queryParams.push(filters.dataDa);
        }
        if (filters.dataA && filters.dataA !== '') {
          conditions.push('data_mov_merce <= ?');
          queryParams.push(filters.dataA);
        }
        if (filters.mese && filters.mese !== 'Tutti' && filters.mese !== '') {
          conditions.push('mese = ?');
          queryParams.push(parseInt(filters.mese));
        }
        if (filters.anno && filters.anno !== 'Tutti' && filters.anno !== '') {
          conditions.push('anno = ?');
          queryParams.push(parseInt(filters.anno));
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const sql = `
        SELECT * FROM fatt_delivery 
        ${whereClause}
        ORDER BY data_mov_merce DESC
      `;
      
      const [rows] = await pool.query(sql, queryParams);
      const data = rows as any[];
      
      // 🚀 DEBUG: Log per vedere cosa sta succedendo (rimosso in produzione)
      
      // 🚀 LIMITE: Controlla se ci sono troppi record
      if (data.length > 150000) {
        throw new Error(`Dataset troppo grande: ${data.length} record trovati (limite: 150.000). Riduci i filtri per l'export.`);
      }
      
      return data;
    };

    // 🚀 RACE: Esegui export con timeout
    const exportPromise = (async () => {
      const [fatture, statsResult] = await Promise.all([
        getAllDeliveryData(validFilters),
        includeStats ? getDeliveryStats(validFilters) : null
      ]);

      const stats = statsResult;

    const workbook = XLSX.utils.book_new();

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
    const dataSheet = XLSX.utils.json_to_sheet(fatture.map(record => ({
      'ID': record.id,
      'Consegna': record.consegna_num,
      'Data Movimento Merce': formatDateEuropean(record.data_mov_merce),
      'Viaggio': record.viaggio,
      'Deposito': record.dep,
      'Ordine': record.ordine,
      'Vettore': record.descr_vettore,
      'Tipologia': record.tipologia,
      'Cliente': record.ragione_sociale,
      'Cod_Cliente': record.cod_cliente,
      'Cod_Articolo': record.cod_articolo,
      'Descrizione_Articolo': record.descr_articolo,
      'Colli': Number(record.colli) || 0,
      'Tariffa': Number(record.tariffa) || 0,
      'Tariffa_Vuoti': Number(record.tariffa_vuoti) || 0,
      'Compenso': Number(record.compenso) || 0,
      'Tr_Cons': Number(record.tr_cons) || 0,
      'Tot_Compenso': Number(record.tot_compenso) || 0,
      'BU': record.bu,
      'Divisione': record.div,
      'Classe_Prod': record.classe_prod,
      'Classe_Tariffa': record.classe_tariffa,
      'ID_fatt': record.ID_fatt
    })));

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const headerRange = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!dataSheet[cellAddress]) continue;
      dataSheet[cellAddress].s = headerStyle;
    }

    dataSheet['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 30 },
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
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
        ['Totale Corrispettivi', `€ ${Number(stats.totalCorrispettivi).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`],
        ['Totale Fatturato', `€ ${Number(stats.totalFatturato).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`],
        ['Media Colli/Consegna', Number(stats.totalColli / stats.totalConsegne || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })],
        ['Media Compenso/Consegna', `€ ${Number(stats.totalCompenso / stats.totalConsegne || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`]
      ];

      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      statsSheet['A1'].s = headerStyle;
      statsSheet['B1'].s = headerStyle;
      statsSheet['!cols'] = [
        { wch: 25 }, // Metrica
        { wch: 20 }  // Valore
      ];
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiche');
    }

    // Foglio 3: Analisi per Vettore (se richiesta)
    if (includeVettoreAnalysis && fatture.length > 0) {
      const vettoreStats = new Map();
      fatture.forEach(record => {
        const vettore = record.descr_vettore;
        if (!vettoreStats.has(vettore)) {
          vettoreStats.set(vettore, {
            vettore,
            consegne: new Set(),
            viaggi: new Set(),
            colli: 0,
            compenso: 0,
            corrispettivi: 0,
            totCompenso: 0
          });
        }
        const stats = vettoreStats.get(vettore);
        stats.consegne.add(record.consegna_num);
        stats.viaggi.add(record.viaggio);
        stats.colli += Number(record.colli) || 0;
        stats.compenso += Number(record.compenso) || 0;
        stats.corrispettivi += Number(record.tr_cons) || 0;
        stats.totCompenso += Number(record.tot_compenso) || 0;
      });

      const vettoreData = Array.from(vettoreStats.values()).map(stats => {
        const numColli = Number(stats.colli) || 0;
        const numCompenso = Number(stats.compenso) || 0;
        const numTotCompenso = Number(stats.totCompenso) || 0;
        const numConsegne = stats.consegne.size;
        return {
          'Vettore': stats.vettore,
          'Consegne': numConsegne,
          'Viaggi': stats.viaggi.size,
          'Colli': numColli,
          'Compenso': numCompenso,
          'Corrispettivi': Number(stats.corrispettivi) || 0,
          'Tot. Compenso': numTotCompenso,
          'Media Colli/Consegna': numConsegne > 0 ? (numColli / numConsegne).toFixed(2) : '0.00',
          'Media Compenso/Consegna': numConsegne > 0 ? (numCompenso / numConsegne).toFixed(2) : '0.00'
        };
      });

      vettoreData.sort((a, b) => b['Tot. Compenso'] - a['Tot. Compenso']);
      const vettoreSheet = XLSX.utils.json_to_sheet(vettoreData);
      const vettoreHeaderRange = XLSX.utils.decode_range(vettoreSheet['!ref'] || 'A1');
      for (let col = vettoreHeaderRange.s.c; col <= vettoreHeaderRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!vettoreSheet[cellAddress]) continue;
        vettoreSheet[cellAddress].s = headerStyle;
      }
      vettoreSheet['!cols'] = [
        { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, vettoreSheet, 'Analisi per Vettore');
    }

    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true
    });

      const filename = `fatturazione_delivery_${new Date().toISOString().slice(0, 10)}.xlsx`;
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    })();

    // 🚀 RACE: Esegui con timeout
    return await Promise.race([exportPromise, timeoutPromise]) as NextResponse;
  } catch (error) {
    console.error('Errore durante l\'export Excel:', error);
    
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Export timeout: il dataset è troppo grande. Prova a ridurre i filtri o contatta l\'amministratore.' 
      }, { status: 408 });
    }
    
    if (error instanceof Error && error.message.includes('troppo grande')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 413 });
    }
    
    return NextResponse.json({ error: 'Errore durante la generazione del file Excel.' }, { status: 500 });
  }
}
