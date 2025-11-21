const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'import', 'Resi_vuoti_non_pagati.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converti in JSON per vedere la struttura
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Prendi la prima riga come header
  const headers = data[0] || [];
  
  console.log('📋 Colonne trovate nel file:');
  console.log('='.repeat(60));
  headers.forEach((col, index) => {
    console.log(`${index + 1}. ${col || '(vuoto)'}`);
  });
  console.log('='.repeat(60));
  console.log(`\nTotale colonne: ${headers.length}`);
  
  // Mostra anche un esempio di riga dati se presente
  if (data.length > 1) {
    console.log('\n📊 Esempio prima riga dati:');
    const firstRow = data[1];
    headers.forEach((header, index) => {
      const value = firstRow[index];
      console.log(`  ${header}: ${value !== undefined ? value : '(vuoto)'} (tipo: ${typeof value})`);
    });
  }
  
} catch (error) {
  console.error('❌ Errore nella lettura del file:', error.message);
  process.exit(1);
}

