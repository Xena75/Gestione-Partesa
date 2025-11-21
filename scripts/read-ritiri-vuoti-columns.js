const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'import', 'Ritiri & Vuoti.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Inserimento';
  const worksheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const headers = data[0] || [];
  
  console.log('📋 Colonne del foglio "Inserimento":');
  console.log('='.repeat(70));
  headers.forEach((col, index) => {
    console.log(`${String(index + 1).padStart(2)}. ${col || '(vuoto)'}`);
  });
  console.log('='.repeat(70));
  console.log(`\nTotale colonne: ${headers.length}`);
  console.log(`Totale righe dati: ${data.length - 1}`);
  
  // Analizza i tipi di dati e valori unici per le prime colonne
  console.log('\n📊 Analisi dettagliata colonne:');
  console.log('='.repeat(70));
  
  headers.forEach((header, colIndex) => {
    const values = [];
    const types = new Set();
    
    // Analizza le prime 10 righe per capire i tipi
    for (let i = 1; i <= Math.min(10, data.length - 1); i++) {
      const value = data[i][colIndex];
      if (value !== undefined && value !== null && value !== '') {
        values.push(value);
        types.add(typeof value);
      }
    }
    
    console.log(`\n${colIndex + 1}. ${header}:`);
    console.log(`   Tipo/i rilevato/i: ${Array.from(types).join(', ') || 'vuoto'}`);
    if (values.length > 0) {
      console.log(`   Esempi valori: ${values.slice(0, 3).join(', ')}`);
      if (values.length > 3) console.log(`   ... e altri ${values.length - 3} valori`);
    } else {
      console.log(`   Valore: (tutti vuoti nelle prime righe)`);
    }
  });
  
  // Mostra alcune righe complete come esempio
  console.log('\n\n📄 Esempi righe complete (prime 3):');
  console.log('='.repeat(70));
  for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
    const row = data[i];
    console.log(`\n--- Riga ${i} ---`);
    headers.forEach((header, index) => {
      const value = row[index];
      const displayValue = value !== undefined && value !== null ? String(value) : '(vuoto)';
      console.log(`  ${header}: ${displayValue}`);
    });
  }
  
} catch (error) {
  console.error('❌ Errore nella lettura del file:', error.message);
  console.error(error.stack);
  process.exit(1);
}
