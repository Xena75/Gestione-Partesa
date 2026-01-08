const XLSX = require('xlsx');
const path = require('path');

async function verificaLetturaExcel() {
  try {
    console.log('🔍 VERIFICA LETTURA FILE EXCEL - TOT_HAND\n');
    console.log('='.repeat(80));
    
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leggi con diverse opzioni per vedere le differenze
    const dataJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const dataRaw = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
    const dataRawNumbers = XLSX.utils.sheet_to_json(worksheet, { defval: '', rawNumbers: true });
    
    console.log(`✅ File letto: ${dataJson.length} righe totali\n`);
    
    // Trova righe con valori che potrebbero avere problemi (cerca valori con 4 decimali)
    console.log(`🔍 Cerca righe con valori che potrebbero avere problemi di precisione...\n`);
    
    const righeProblema = [];
    
    for (let i = 0; i < Math.min(1000, dataJson.length); i++) {
      const rowJson = dataJson[i];
      const rowRaw = dataRaw[i];
      const rowRawNumbers = dataRawNumbers[i];
      
      const totHandJson = rowJson.tot_hand || rowJson['tot_hand'];
      const totHandRaw = rowRaw.tot_hand || rowRaw['tot_hand'];
      const totHandRawNumbers = rowRawNumbers.tot_hand || rowRawNumbers['tot_hand'];
      
      // Verifica se ci sono differenze tra i metodi di lettura
      const valJson = parseFloat(totHandJson) || 0;
      const valRaw = parseFloat(totHandRaw) || 0;
      const valRawNumbers = parseFloat(totHandRawNumbers) || 0;
      
      // Cerca valori che finiscono con .3570, .7140, etc (che potrebbero essere arrotondati)
      const totHandStr = String(totHandJson);
      if (totHandStr.includes('.357') || totHandStr.includes('.714')) {
        righeProblema.push({
          riga: i + 1,
          doc_mat: rowJson.doc_mat,
          materiale: rowJson.materiale,
          totHandJson: totHandJson,
          totHandRaw: totHandRaw,
          totHandRawNumbers: totHandRawNumbers,
          tipoJson: typeof totHandJson,
          tipoRaw: typeof totHandRaw,
          tipoRawNumbers: typeof totHandRawNumbers,
          valJson: valJson,
          valRaw: valRaw,
          valRawNumbers: valRawNumbers
        });
        
        if (righeProblema.length >= 10) break;
      }
    }
    
    if (righeProblema.length > 0) {
      console.log(`📋 RIGHE CON VALORI POTENZIALMENTE PROBLEMATICI:\n`);
      console.log(`${'Riga'.padEnd(6)} ${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'JSON'.padEnd(15)} ${'Raw'.padEnd(15)} ${'RawNumbers'.padEnd(15)} ${'Tipo JSON'.padEnd(12)}`);
      console.log(`${'-'.repeat(100)}`);
      
      righeProblema.forEach(row => {
        console.log(
          `${String(row.riga).padEnd(6)} ` +
          `${String(row.doc_mat).padEnd(12)} ` +
          `${String(row.materiale || '').padEnd(15)} ` +
          `${String(row.totHandJson).padEnd(15)} ` +
          `${String(row.totHandRaw).padEnd(15)} ` +
          `${String(row.totHandRawNumbers).padEnd(15)} ` +
          `${row.tipoJson.padEnd(12)}`
        );
      });
    } else {
      console.log(`⚠️  Nessuna riga con pattern .357 o .714 trovata nelle prime 1000 righe`);
    }
    
    // Verifica alcuni valori specifici che sappiamo avere differenze
    console.log(`\n🔍 Verifica valori specifici con differenze note...\n`);
    
    const valoriSpecifici = [
      { doc_mat: 492612637, materiale: 'E9030' },
      { doc_mat: 492612637, materiale: 'C413' },
      { doc_mat: 492612638, materiale: '4005T' }
    ];
    
    valoriSpecifici.forEach(target => {
      const found = dataJson.find(row => 
        (row.doc_mat === target.doc_mat || row['doc_mat'] === target.doc_mat) &&
        (row.materiale === target.materiale || row['materiale'] === target.materiale)
      );
      
      if (found) {
        const totHand = found.tot_hand || found['tot_hand'];
        const totHandNum = parseFloat(totHand);
        const totHandStr = String(totHand);
        const tipo = typeof totHand;
        
        console.log(`   doc_mat: ${target.doc_mat}, materiale: ${target.materiale}`);
        console.log(`      Valore: ${totHand} (tipo: ${tipo}, numero: ${totHandNum}, stringa: "${totHandStr}")`);
        console.log(`      Decimali nella stringa: ${totHandStr.includes('.') ? totHandStr.split('.')[1]?.length || 0 : 0}`);
        console.log(``);
      } else {
        console.log(`   ⚠️  Non trovato: doc_mat: ${target.doc_mat}, materiale: ${target.materiale}`);
      }
    });
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

verificaLetturaExcel().catch(console.error);

