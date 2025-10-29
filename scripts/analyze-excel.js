const XLSX = require('xlsx');
const path = require('path');

// Percorso del file Excel
const excelFilePath = path.join(__dirname, '..', 'import', 'Saldi ferie.xlsx');

console.log('Analisi del file Excel: Saldi ferie.xlsx');
console.log('Percorso:', excelFilePath);
console.log('='.repeat(60));

try {
    // Leggi il file Excel
    const workbook = XLSX.readFile(excelFilePath);
    
    // Ottieni i nomi dei fogli
    const sheetNames = workbook.SheetNames;
    console.log('Fogli di lavoro trovati:', sheetNames.length);
    sheetNames.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
    });
    console.log('');
    
    // Analizza ogni foglio
    sheetNames.forEach((sheetName, sheetIndex) => {
        console.log(`ANALISI FOGLIO: "${sheetName}"`);
        console.log('-'.repeat(40));
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Converti il foglio in JSON per analizzarlo
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            console.log('   Foglio vuoto');
            console.log('');
            return;
        }
        
        // Mostra informazioni generali
        console.log(`   Numero totale di righe: ${jsonData.length}`);
        
        // Mostra le intestazioni (prima riga)
        if (jsonData[0]) {
            console.log('   Intestazioni delle colonne:');
            jsonData[0].forEach((header, index) => {
                if (header !== undefined && header !== null && header !== '') {
                    console.log(`      ${String.fromCharCode(65 + index)}: ${header}`);
                }
            });
        }
        
        // Mostra le prime 5 righe di dati (escludendo l'intestazione)
        console.log('   Prime righe di dati:');
        const dataRows = jsonData.slice(1, 6); // Prendi le prime 5 righe dopo l'intestazione
        
        if (dataRows.length === 0) {
            console.log('      Nessun dato trovato oltre l\'intestazione');
        } else {
            dataRows.forEach((row, rowIndex) => {
                console.log(`      Riga ${rowIndex + 2}:`, row.filter(cell => cell !== undefined && cell !== null && cell !== ''));
            });
        }
        
        // Analizza i tipi di dati
        if (jsonData.length > 1) {
            console.log('   Analisi tipi di dati:');
            const sampleRow = jsonData[1]; // Usa la seconda riga come campione
            sampleRow.forEach((cell, index) => {
                if (cell !== undefined && cell !== null && cell !== '') {
                    const header = jsonData[0][index] || `Colonna ${index + 1}`;
                    const type = typeof cell;
                    const isDate = cell instanceof Date || (typeof cell === 'string' && !isNaN(Date.parse(cell)));
                    const isNumber = typeof cell === 'number' || (typeof cell === 'string' && !isNaN(parseFloat(cell)));
                    
                    let dataType = type;
                    if (isDate && type === 'string') dataType = 'data';
                    if (isNumber && type === 'string') dataType = 'numero';
                    
                    console.log(`      ${header}: ${dataType} (valore: ${cell})`);
                }
            });
        }
        
        console.log('');
    });
    
    // Riepilogo finale
    console.log('RIEPILOGO ANALISI');
    console.log('='.repeat(60));
    console.log('File analizzato con successo');
    console.log(`Fogli trovati: ${sheetNames.length}`);
    sheetNames.forEach((name, index) => {
        const worksheet = workbook.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`   ${index + 1}. "${name}": ${jsonData.length} righe`);
    });
    
} catch (error) {
    console.error('Errore durante l\'analisi del file Excel:');
    console.error(error.message);
    
    if (error.code === 'ENOENT') {
        console.error('Suggerimento: Verifica che il file esista nel percorso specificato');
    }
}