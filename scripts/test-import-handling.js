const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Simula la funzione convertDate dell'API
function convertDate(dateValue) {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'number') {
    // Excel date (numero di giorni dal 1 gennaio 1900)
    try {
      const excelDate = XLSX.SSF.parse_date_code(dateValue);
      if (excelDate) {
        const year = excelDate.y;
        const month = String(excelDate.m).padStart(2, '0');
        const day = String(excelDate.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error('Errore conversione data Excel:', e);
    }
  }
  
  if (typeof dateValue === 'string') {
    // Prova a parsare come data
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Prova formato italiano gg/mm/aaaa
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
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

async function testImport() {
  const filePath = path.join(__dirname, '..', 'import', 'Mensili', 'Handling_da_importare.xlsx');
  
  console.log('📁 Test import file:', filePath);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leggi solo le prime 10 righe per test
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log('📊 Righe totali nel file:', data.length);
    console.log('🧪 Test su prime 10 righe:\n');
    
    const errors = [];
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      console.log(`\n--- Riga ${i + 1} ---`);
      
      try {
        // Simula la preparazione dei valori come nell'API
        const div = String(row.div || '').trim();
        const deposito = null; // Simulato
        
        const values = [
          row.source_name || null,
          row.appalto || null,
          row.bu || null,
          row.em_fatt || null,
          row.rag_soc || null,
          div || null,
          deposito,
          convertNumber(row.mag),
          convertNumber(row.tmv),
          row.tipo_movimento || null,
          convertNumber(row.doc_mat),
          convertNumber(row.esmat),
          convertNumber(row.pos),
          row.materiale || null,
          row.descrizione_materiale || null,
          row.gr_m || null,
          convertNumber(row['Comp.']),
          row.oda || null,
          convertNumber(row.esmat_1),
          row.cliente || null,
          convertDate(row.data_mov_m),
          convertNumber(row.quantita),
          row.umo || null,
          convertNumber(row.qta_uma),
          row.tipo_imb || null,
          convertNumber(row.t_hf_umv),
          convertNumber(row['Imp. H. UM']),
          convertNumber(row['Imp.Resi V']),
          convertNumber(row['Imp. Doc.']),
          convertNumber(row.tot_hand),
          convertNumber(row.Mese || row.mese)
        ];
        
        console.log('  ✅ Valori preparati correttamente');
        console.log(`     Mese: ${values[31]}`);
        console.log(`     Data convertita: ${values[20]}`);
        console.log(`     Div: ${values[5]}`);
        console.log(`     Tot_hand: ${values[29]}`);
        
        // Verifica che tutti i valori siano validi
        if (values.length !== 32) {
          throw new Error(`Numero errato di valori: ${values.length} invece di 32`);
        }
        
        // Verifica che non ci siano valori undefined (solo null)
        const hasUndefined = values.some(v => v === undefined);
        if (hasUndefined) {
          throw new Error('Trovati valori undefined nei dati');
        }
        
      } catch (error) {
        console.error(`  ❌ Errore riga ${i + 1}:`, error.message);
        errors.push({ riga: i + 1, errore: error.message });
      }
    }
    
    console.log('\n\n📊 Riepilogo:');
    console.log(`   Righe testate: ${Math.min(10, data.length)}`);
    console.log(`   Errori trovati: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errori:');
      errors.forEach(e => {
        console.log(`   Riga ${e.riga}: ${e.errore}`);
      });
    } else {
      console.log('✅ Nessun errore trovato nelle prime 10 righe');
      console.log('\n⚠️  Il problema potrebbe essere:');
      console.log('   1. File troppo grande (148.400 righe) - timeout o memoria');
      console.log('   2. Errore durante l\'inserimento nel database');
      console.log('   3. Problema di connessione al database durante l\'elaborazione');
    }
    
    // Test conversione date
    console.log('\n📅 Test conversione date:');
    const dateSample = data.slice(0, 5).map(r => r.data_mov_m);
    dateSample.forEach((dateVal, idx) => {
      const converted = convertDate(dateVal);
      console.log(`   ${dateVal} -> ${converted}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    console.error('Stack:', error.stack);
  }
}

testImport();
