const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function analizzaFileHandling() {
  const filePath = path.join(__dirname, '..', 'import', 'Mensili', 'Handling_da_importare.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File non trovato:', filePath);
    return;
  }

  console.log('📁 Analisi file:', filePath);
  console.log('📊 Dimensione file:', (fs.statSync(filePath).size / 1024 / 1024).toFixed(2), 'MB\n');

  try {
    // Leggi il file Excel
    const workbook = XLSX.readFile(filePath);
    
    console.log('📋 Fogli disponibili:', workbook.SheetNames.join(', '));
    console.log('📄 Usando il primo foglio:', workbook.SheetNames[0], '\n');
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leggi i dati con header
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log('📊 Totale righe trovate:', data.length);
    
    if (data.length === 0) {
      console.error('❌ Il file non contiene dati!');
      return;
    }

    // Mostra le colonne presenti nel file
    const firstRow = data[0];
    const colonne = Object.keys(firstRow);
    
    console.log('\n📋 Colonne trovate nel file (' + colonne.length + '):');
    colonne.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    // Colonne attese dall'API
    const colonneAttese = [
      'source_name',
      'appalto',
      'bu',
      'em_fatt',
      'rag_soc',
      'div',
      'mag',
      'tmv',
      'tipo_movimento',
      'doc_mat',
      'esmat',
      'pos',
      'materiale',
      'descrizione_materiale',
      'gr_m',
      'Comp.',
      'oda',
      'esmat_1',
      'cliente',
      'data_mov_m',
      'quantita',
      'umo',
      'qta_uma',
      'tipo_imb',
      't_hf_umv',
      'Imp. H. UM',
      'Imp.Resi V',
      'Imp. Doc.',
      'tot_hand',
      'mese'
    ];

    console.log('\n🔍 Verifica mapping colonne:');
    console.log('Colonne attese dall\'API vs Colonne presenti nel file:\n');
    
    const colonneMancanti = [];
    const colonneTrovate = [];
    
    colonneAttese.forEach(colAttesa => {
      // Cerca la colonna (case-insensitive e con normalizzazione spazi)
      const colTrovata = colonne.find(c => 
        c.toLowerCase().trim() === colAttesa.toLowerCase().trim() ||
        c.replace(/\s+/g, ' ').toLowerCase() === colAttesa.replace(/\s+/g, ' ').toLowerCase()
      );
      
      if (colTrovata) {
        colonneTrovate.push({ attesa: colAttesa, trovata: colTrovata });
        console.log(`  ✅ ${colAttesa.padEnd(25)} -> "${colTrovata}"`);
      } else {
        colonneMancanti.push(colAttesa);
        console.log(`  ❌ ${colAttesa.padEnd(25)} -> NON TROVATA`);
      }
    });

    // Mostra colonne nel file che non sono mappate
    console.log('\n📌 Colonne nel file non mappate:');
    const colonneNonMappate = colonne.filter(c => 
      !colonneAttese.some(attesa => 
        c.toLowerCase().trim() === attesa.toLowerCase().trim() ||
        c.replace(/\s+/g, ' ').toLowerCase() === attesa.replace(/\s+/g, ' ').toLowerCase()
      )
    );
    
    if (colonneNonMappate.length > 0) {
      colonneNonMappate.forEach(col => {
        console.log(`  ⚠️  "${col}"`);
      });
    } else {
      console.log('  (nessuna)');
    }

    // Analizza alcune righe di esempio
    console.log('\n📝 Esempio prime 3 righe:');
    for (let i = 0; i < Math.min(3, data.length); i++) {
      console.log(`\n  Riga ${i + 1}:`);
      const row = data[i];
      const campiChiave = ['mese', 'div', 'materiale', 'tot_hand', 'data_mov_m'];
      campiChiave.forEach(campo => {
        const colTrovata = colonne.find(c => 
          c.toLowerCase().trim() === campo.toLowerCase().trim()
        );
        if (colTrovata) {
          console.log(`    ${campo}: ${row[colTrovata]}`);
        }
      });
    }

    // Verifica problemi comuni
    console.log('\n🔍 Verifica problemi comuni:');
    
    // Verifica se ci sono righe vuote
    const righeVuote = data.filter(row => {
      const valori = Object.values(row);
      return valori.every(v => v === '' || v === null || v === undefined);
    });
    if (righeVuote.length > 0) {
      console.log(`  ⚠️  Trovate ${righeVuote.length} righe completamente vuote`);
    }

    // Verifica valori null o undefined critici
    const righeSenzaMese = data.filter(row => {
      const colMese = colonne.find(c => c.toLowerCase().includes('mese'));
      return !colMese || !row[colMese];
    });
    if (righeSenzaMese.length > 0) {
      console.log(`  ⚠️  Trovate ${righeSenzaMese.length} righe senza mese`);
    }

    // Verifica formato date
    const colData = colonne.find(c => 
      c.toLowerCase().includes('data') && c.toLowerCase().includes('mov')
    );
    if (colData) {
      const dateSample = data.slice(0, 10).map(r => r[colData]).filter(d => d);
      console.log(`  📅 Esempi di date trovate (campo "${colData}"):`, dateSample.slice(0, 5));
    }

    console.log('\n✅ Analisi completata!');
    
    if (colonneMancanti.length > 0) {
      console.log('\n⚠️  ATTENZIONE: Alcune colonne attese non sono state trovate nel file!');
      console.log('   Questo potrebbe causare errori durante l\'importazione.');
    }

  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error);
    console.error('Stack:', error.stack);
  }
}

analizzaFileHandling();
