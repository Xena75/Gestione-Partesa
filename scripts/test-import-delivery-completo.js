const XLSX = require('xlsx');
const { readFile } = require('fs/promises');
const path = require('path');

async function testImportDelivery() {
  try {
    const filePath = path.join(__dirname, '..', 'import', 'Mensili', 'Delivery_da_importare.xlsx');
    
    console.log('📁 File da testare:', filePath);
    
    // Leggi il file Excel
    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe`);
    
    // Rimuovi source_name se presente
    data.forEach(row => {
      if (row.source_name !== undefined) {
        delete row.source_name;
      }
    });
    
    // Test preparazione valori (prime 3 righe)
    const fileName = 'Delivery_da_importare.xlsx';
    
    function convertDate(dateValue) {
      if (!dateValue) return null;
      if (typeof dateValue === 'number') {
        try {
          const excelDate = XLSX.SSF.parse_date_code(dateValue);
          if (excelDate) {
            const year = excelDate.y;
            const month = String(excelDate.m).padStart(2, '0');
            const day = String(excelDate.d).padStart(2, '0');
            return `${year}-${month}-${day} 00:00:00`;
          }
        } catch (e) {}
      }
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 19).replace('T', ' ');
        }
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day} 00:00:00`;
        }
      }
      return null;
    }
    
    function convertNumber(value) {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return value;
      const num = parseFloat(String(value));
      return isNaN(num) ? null : num;
    }
    
    console.log('\n🧪 Test preparazione valori (prime 3 righe):');
    const testRows = data.slice(0, Math.min(3, data.length));
    
    testRows.forEach((row, idx) => {
      console.log(`\n   Riga ${idx + 1}:`);
      try {
        const values = [
          fileName, // source_name - SEMPRE il nome del file, non dal row
          row.appalto || null,
          row.ordine || null,
          convertNumber(row.cod_vettore),
          row.descr_vettore || null,
          row.viaggio || null,
          row.consegna_num || null,
          row.cod_cliente || null,
          row.ragione_sociale || null,
          row.cod_articolo || null,
          row.descr_articolo || null,
          row.gr_stat || null,
          row.descr_gruppo_st || null,
          row.classe_prod || null,
          row.descr_classe_prod || null,
          row.classe_tariffa || null,
          row.anomalia || null,
          convertDate(row.data_mov_merce),
          convertNumber(row.colli),
          convertNumber(row.tariffa),
          convertNumber(row.tariffa_vuoti),
          convertNumber(row.compenso),
          convertNumber(row.tr_cons),
          convertNumber(row.tot_compenso),
          row.bu || null,
          row.div || null,
          row.dep || row.Deposito || null,
          row.tipologia || null,
          row.cod_em_fat || null,
          row.emittente_fattura || null,
          row.oda || null,
        ];
        
        console.log(`      ✅ Valori preparati: ${values.length} valori`);
        console.log(`      📋 source_name: "${values[0]}" (tipo: ${typeof values[0]})`);
        console.log(`      📋 Sample: appalto="${values[1]}", ordine="${values[2]}"`);
        
        // Verifica che source_name sia una stringa valida
        if (typeof values[0] !== 'string' || values[0].includes('\x80') || values[0].includes('\x00')) {
          console.error(`      ❌ ERRORE: source_name contiene dati binari o non è una stringa valida!`);
          console.error(`         Valore: ${JSON.stringify(values[0].substring(0, 50))}`);
        } else {
          console.log(`      ✅ source_name è una stringa valida`);
        }
        
        // Verifica che tutti i valori siano validi
        const invalidValues = values.filter(v => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string' && (v.includes('\x80') || v.includes('\x00'))) return true;
          return false;
        });
        
        if (invalidValues.length > 0) {
          console.error(`      ⚠️  Valori con dati binari trovati: ${invalidValues.length}`);
        } else {
          console.log(`      ✅ Tutti i valori sono validi`);
        }
        
      } catch (error) {
        console.error(`      ❌ Errore: ${error.message}`);
      }
    });
    
    // Verifica struttura query
    console.log('\n🔍 Verifica struttura query SQL:');
    const insertQuery = `
      INSERT INTO fatt_delivery (
        source_name,
        appalto,
        ordine,
        cod_vettore,
        descr_vettore,
        viaggio,
        consegna_num,
        cod_cliente,
        ragione_sociale,
        cod_articolo,
        descr_articolo,
        gr_stat,
        descr_gruppo_st,
        classe_prod,
        descr_classe_prod,
        classe_tariffa,
        anomalia,
        data_mov_merce,
        colli,
        tariffa,
        tariffa_vuoti,
        compenso,
        tr_cons,
        tot_compenso,
        bu,
        \`div\`,
        dep,
        tipologia,
        cod_em_fat,
        emittente_fattura,
        oda
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const fields = insertQuery.match(/INSERT INTO[^(]+\(([^)]+)\)/)[1].split(',').map(f => f.trim().replace(/`/g, ''));
    const placeholders = insertQuery.match(/VALUES \(([^)]+)\)/)[1].split(',').map(p => p.trim());
    
    console.log(`   ✅ Campi INSERT: ${fields.length}`);
    console.log(`   ✅ Placeholder VALUES: ${placeholders.length}`);
    console.log(`   ✅ Match: ${fields.length === placeholders.length ? 'OK' : 'ERRORE'}`);
    console.log(`   ✅ Campo 'div' protetto: ${insertQuery.includes('`div`') ? 'SÌ' : 'NO'}`);
    
    console.log('\n✅ Test completato!');
    console.log('   Il file è pronto per l\'import (nessun dato inserito in tabella)');
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error);
    console.error('   Stack:', error.stack);
  }
}

testImportDelivery();
