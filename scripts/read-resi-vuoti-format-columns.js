const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'import', 'Resi_vuoti_non_pagati_format.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  
  console.log('📋 Fogli disponibili nel file:');
  workbook.SheetNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });
  console.log('='.repeat(70));
  
  // Analizza tutti i fogli
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data[0] || [];
    
    console.log(`\n📄 Foglio "${sheetName}":`);
    console.log(`   Colonne (${headers.length}):`);
    headers.forEach((col, index) => {
      console.log(`   ${String(index + 1).padStart(2)}. ${col || '(vuoto)'}`);
    });
    console.log(`   Righe dati: ${data.length - 1}`);
    
    // Analizza i tipi di dati
    if (data.length > 1) {
      console.log(`\n   📊 Analisi dettagliata colonne:`);
      headers.forEach((header, colIndex) => {
        const values = [];
        const types = new Set();
        
        // Analizza le prime 10 righe
        for (let i = 1; i <= Math.min(10, data.length - 1); i++) {
          const value = data[i][colIndex];
          if (value !== undefined && value !== null && value !== '') {
            values.push(value);
            types.add(typeof value);
          }
        }
        
        console.log(`\n   ${colIndex + 1}. ${header}:`);
        console.log(`      Tipo/i: ${Array.from(types).join(', ') || 'vuoto'}`);
        if (values.length > 0) {
          console.log(`      Esempi: ${values.slice(0, 3).join(', ')}`);
        }
      });
      
      // Mostra esempi righe
      console.log(`\n   📄 Esempi righe complete (prime 3):`);
      for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
        const row = data[i];
        console.log(`\n   --- Riga ${i} ---`);
        headers.forEach((header, index) => {
          const value = row[index];
          const displayValue = value !== undefined && value !== null ? String(value) : '(vuoto)';
          console.log(`     ${header}: ${displayValue}`);
        });
      }
    }
  });
  
} catch (error) {
  console.error('❌ Errore nella lettura del file:', error.message);
  console.error(error.stack);
  process.exit(1);
}

