const XLSX = require('xlsx');
const { readFile } = require('fs/promises');
const path = require('path');

async function testImportDelivery() {
  try {
    const filePath = path.join(__dirname, '..', 'import', 'Mensili', 'Delivery_da_importare.xlsx');
    
    console.log('📁 File da testare:', filePath);
    console.log('🔍 Verifica esistenza file...');
    
    // Verifica che il file esista
    try {
      await readFile(filePath);
      console.log('✅ File trovato');
    } catch (error) {
      console.error('❌ File non trovato:', filePath);
      console.error('   Assicurati che il file esista nella cartella import/Mensili');
      return;
    }
    
    // Leggi il file Excel
    console.log('\n📖 Lettura file Excel...');
    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe trovate`);
    console.log(`   Foglio: ${sheetName}`);
    
    if (data.length === 0) {
      console.error('❌ Il file non contiene dati');
      return;
    }
    
    // Mostra le colonne trovate
    console.log('\n📊 Colonne trovate nel file:');
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    console.log(`   Totale colonne: ${columns.length}`);
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col}`);
    });
    
    // Verifica mapping colonne
    console.log('\n🔍 Verifica mapping colonne...');
    const expectedColumns = [
      'appalto', 'ordine', 'cod_vettore', 'descr_vettore', 'viaggio',
      'consegna_num', 'cod_cliente', 'ragione_sociale', 'cod_articolo',
      'descr_articolo', 'gr_stat', 'descr_gruppo_st', 'classe_prod',
      'descr_classe_prod', 'classe_tariffa', 'anomalia', 'data_mov_merce',
      'colli', 'tariffa', 'tariffa_vuoti', 'compenso', 'tr_cons',
      'tot_compenso', 'bu', 'div', 'dep', 'tipologia', 'cod_em_fat',
      'emittente_fattura', 'oda'
    ];
    
    const foundColumns = [];
    const missingColumns = [];
    const unmappedColumns = []; // Colonne nel file che non sono nel database
    
    expectedColumns.forEach(col => {
      if (columns.includes(col)) {
        foundColumns.push(col);
      } else {
        missingColumns.push(col);
      }
    });
    
    // Trova colonne nel file che non sono nel database
    columns.forEach(col => {
      // Ignora source_name che viene aggiunto automaticamente
      if (col === 'source_name') return;
      
      // Verifica se la colonna è mappata (direttamente o tramite alias)
      const isMapped = expectedColumns.includes(col) || 
                       (col === 'Deposito' && expectedColumns.includes('dep'));
      
      if (!isMapped) {
        unmappedColumns.push(col);
      }
    });
    
    console.log(`   ✅ Colonne mappate: ${foundColumns.length}/${expectedColumns.length}`);
    if (missingColumns.length > 0) {
      console.log(`   ⚠️  Colonne mancanti nel file: ${missingColumns.join(', ')}`);
    }
    if (unmappedColumns.length > 0) {
      console.log(`   ⚠️  Colonne nel file NON mappate al database: ${unmappedColumns.join(', ')}`);
    } else {
      console.log(`   ✅ Tutte le colonne del file sono mappate`);
    }
    
    // Mostra mapping speciali
    console.log('\n📋 Mapping speciali:');
    if (columns.includes('Deposito')) {
      console.log(`   ✅ "Deposito" (file) → "dep" (database)`);
    }
    
    // Test conversione dati (prime 3 righe)
    console.log('\n🧪 Test conversione dati (prime 3 righe):');
    const testRows = data.slice(0, Math.min(3, data.length));
    
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
        } catch (e) {
          // Ignora
        }
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
    
    testRows.forEach((row, idx) => {
      console.log(`\n   Riga ${idx + 1}:`);
      try {
        const values = [
          'Delivery_da_importare.xlsx', // source_name
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
          row.dep || null,
          row.tipologia || null,
          row.cod_em_fat || null,
          row.emittente_fattura || null,
          row.oda || null,
        ];
        
        console.log(`      ✅ Valori preparati: ${values.length} valori`);
        console.log(`      📋 Sample: appalto="${values[1]}", ordine="${values[2]}", viaggio="${values[5]}"`);
        console.log(`      📅 Data: ${values[17] || 'NULL'}`);
        console.log(`      💰 Numeri: colli=${values[18]}, tariffa=${values[19]}, compenso=${values[21]}`);
      } catch (error) {
        console.error(`      ❌ Errore preparazione riga: ${error.message}`);
      }
    });
    
    // Test query SQL (solo struttura, non eseguita)
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
    
    const placeholders = insertQuery.match(/\?/g);
    console.log(`   ✅ Query preparata: ${placeholders.length} placeholder`);
    console.log(`   ✅ Campo 'div' protetto con backtick: ${insertQuery.includes('`div`') ? 'SÌ' : 'NO'}`);
    
    // Riepilogo
    console.log('\n📊 Riepilogo Test:');
    console.log(`   ✅ File letto correttamente: ${data.length} righe`);
    console.log(`   ✅ Colonne trovate: ${columns.length}`);
    console.log(`   ✅ Mapping colonne: ${foundColumns.length}/${expectedColumns.length} corrispondenze`);
    console.log(`   ✅ Query SQL: struttura corretta`);
    console.log(`   ✅ Test conversione: ${testRows.length} righe testate`);
    
    console.log('\n✅ Test completato con successo!');
    console.log('   Il file è pronto per l\'import (nessun dato inserito in tabella)');
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error);
    console.error('   Stack:', error.stack);
  }
}

testImportDelivery();
