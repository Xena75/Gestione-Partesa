// Test semplice per verificare l'upload di documenti
console.log('Test upload documento - Creazione file di test...');

const fs = require('fs');
const path = require('path');

// Crea un file di test
const testContent = 'Questo è un documento di test per verificare l\'upload dei documenti veicoli.';
const testFilePath = path.join(__dirname, 'test-document.txt');

try {
  fs.writeFileSync(testFilePath, testContent);
  console.log('✓ File di test creato:', testFilePath);
  console.log('✓ Dimensione file:', fs.statSync(testFilePath).size, 'bytes');
  console.log('\nPer testare l\'upload, usa questo comando PowerShell:');
  console.log('\n$form = @{');
  console.log('  file = Get-Item "test-document.txt"');
  console.log('  document_type = "altro"');
  console.log('  expiry_date = "2025-12-31"');
  console.log('}');
  console.log('Invoke-RestMethod -Uri "http://localhost:3001/api/vehicles/EZ184PF/documents" -Method POST -Form $form');
  console.log('\nOppure prova manualmente dal browser aprendo: http://localhost:3001/vehicles/EZ184PF');
} catch (error) {
  console.error('Errore durante la creazione del file di test:', error);
}