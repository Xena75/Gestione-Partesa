const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'import', 'Mensili', 'Handling_da_importare.xlsx');

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Leggi con header normale
const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log('🔍 Analisi chiavi oggetto:');
console.log('='.repeat(60));

if (data.length > 0) {
  const firstRow = data[0];
  console.log('\n📋 Tutte le chiavi nella prima riga:');
  Object.keys(firstRow).forEach(key => {
    console.log(`   "${key}" = ${firstRow[key]} (tipo: ${typeof firstRow[key]})`);
  });
  
  console.log('\n🔍 Verifica campo Mese:');
  console.log(`   row.Mese = ${firstRow.Mese} (tipo: ${typeof firstRow.Mese})`);
  console.log(`   row.mese = ${firstRow.mese} (tipo: ${typeof firstRow.mese})`);
  console.log(`   row['Mese'] = ${firstRow['Mese']} (tipo: ${typeof firstRow['Mese']})`);
  console.log(`   row['mese'] = ${firstRow['mese']} (tipo: ${typeof firstRow['mese']})`);
  
  // Cerca tutte le chiavi che contengono "mese" (case insensitive)
  const meseKeys = Object.keys(firstRow).filter(k => k.toLowerCase().includes('mese'));
  console.log(`\n🔑 Chiavi contenenti "mese": ${meseKeys.join(', ')}`);
  
  if (meseKeys.length > 0) {
    meseKeys.forEach(key => {
      console.log(`   row["${key}"] = ${firstRow[key]} (tipo: ${typeof firstRow[key]})`);
    });
  }
}
