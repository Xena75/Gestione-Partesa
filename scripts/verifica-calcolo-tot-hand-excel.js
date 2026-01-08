const XLSX = require('xlsx');
const path = require('path');

async function verificaCalcoloTotHandExcel() {
  try {
    console.log('🔍 VERIFICA CALCOLO TOT_HAND NEL FILE EXCEL\n');
    console.log('='.repeat(80));
    
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe\n`);
    
    // Analizza prime 50 righe per vedere se tot_hand corrisponde alla somma dei componenti
    console.log(`📊 ANALISI CALCOLO TOT_HAND (prime 50 righe):\n`);
    
    let corrispondenti = 0;
    let diversi = 0;
    const esempiDiversi = [];
    
    for (let i = 0; i < Math.min(50, data.length); i++) {
      const row = data[i];
      
      const impHfUm = parseFloat(row['Imp. H. UM'] || row['imp_hf_um'] || 0);
      const impResiV = parseFloat(row['Imp.Resi V'] || row['imp_resi_v'] || 0);
      const impDoc = parseFloat(row['Imp. Doc.'] || row['imp_doc'] || 0);
      const totHandExcel = parseFloat(row.tot_hand || row['tot_hand'] || 0);
      
      const totHandCalcolato = impHfUm + impResiV + impDoc;
      const diff = Math.abs(totHandExcel - totHandCalcolato);
      
      if (diff < 0.0001) {
        corrispondenti++;
      } else {
        diversi++;
        if (esempiDiversi.length < 10) {
          esempiDiversi.push({
            riga: i + 1,
            doc_mat: row.doc_mat,
            materiale: row.materiale,
            impHfUm: impHfUm.toFixed(4),
            impResiV: impResiV.toFixed(4),
            impDoc: impDoc.toFixed(4),
            totHandExcel: totHandExcel.toFixed(4),
            totHandCalcolato: totHandCalcolato.toFixed(4),
            diff: diff.toFixed(4)
          });
        }
      }
    }
    
    console.log(`   Corrispondenti: ${corrispondenti}/${Math.min(50, data.length)} (${(corrispondenti/Math.min(50, data.length)*100).toFixed(1)}%)`);
    console.log(`   Diversi: ${diversi}/${Math.min(50, data.length)} (${(diversi/Math.min(50, data.length)*100).toFixed(1)}%)\n`);
    
    if (esempiDiversi.length > 0) {
      console.log(`📋 ESEMPI DI VALORI DIVERSI:\n`);
      console.log(`${'Riga'.padEnd(6)} ${'doc_mat'.padEnd(12)} ${'materiale'.padEnd(15)} ${'imp_hf_um'.padEnd(12)} ${'imp_resi_v'.padEnd(12)} ${'imp_doc'.padEnd(12)} ${'tot_hand Excel'.padEnd(15)} ${'tot_hand Calc'.padEnd(15)} ${'Diff'.padEnd(10)}`);
      console.log(`${'-'.repeat(120)}`);
      esempiDiversi.forEach(ex => {
        console.log(
          `${String(ex.riga).padEnd(6)} ` +
          `${String(ex.doc_mat).padEnd(12)} ` +
          `${String(ex.materiale || '').padEnd(15)} ` +
          `${ex.impHfUm.padEnd(12)} ` +
          `${ex.impResiV.padEnd(12)} ` +
          `${ex.impDoc.padEnd(12)} ` +
          `${ex.totHandExcel.padEnd(15)} ` +
          `${ex.totHandCalcolato.padEnd(15)} ` +
          `${ex.diff.padEnd(10)}`
        );
      });
    }
    
    // Verifica alcuni valori specifici che sappiamo avere differenze
    console.log(`\n🔍 VERIFICA VALORI SPECIFICI CON DIFFERENZE NOTORIE:\n`);
    
    const valoriSpecifici = [
      { doc_mat: 492612637, materiale: 'E9030' },
      { doc_mat: 492612637, materiale: 'C413' },
      { doc_mat: 492612638, materiale: '4005T' }
    ];
    
    valoriSpecifici.forEach(target => {
      const found = data.find(row => 
        (row.doc_mat === target.doc_mat || row['doc_mat'] === target.doc_mat) &&
        (row.materiale === target.materiale || row['materiale'] === target.materiale)
      );
      
      if (found) {
        const impHfUm = parseFloat(found['Imp. H. UM'] || found['imp_hf_um'] || 0);
        const impResiV = parseFloat(found['Imp.Resi V'] || found['imp_resi_v'] || 0);
        const impDoc = parseFloat(found['Imp. Doc.'] || found['imp_doc'] || 0);
        const totHandExcel = parseFloat(found.tot_hand || found['tot_hand'] || 0);
        const totHandCalcolato = impHfUm + impResiV + impDoc;
        const diff = Math.abs(totHandExcel - totHandCalcolato);
        
        console.log(`   doc_mat: ${target.doc_mat}, materiale: ${target.materiale}`);
        console.log(`      imp_hf_um: ${impHfUm.toFixed(4)}`);
        console.log(`      imp_resi_v: ${impResiV.toFixed(4)}`);
        console.log(`      imp_doc: ${impDoc.toFixed(4)}`);
        console.log(`      tot_hand Excel: ${totHandExcel.toFixed(4)}`);
        console.log(`      tot_hand Calcolato: ${totHandCalcolato.toFixed(4)}`);
        console.log(`      Differenza: ${diff.toFixed(4)}`);
        console.log(``);
      }
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n💡 CONCLUSIONE:`);
    console.log(`\n   Se nel file Excel tot_hand NON corrisponde alla somma dei componenti,`);
    console.log(`   allora Access durante l'import ha calcolato tot_hand come somma dei componenti`);
    console.log(`   invece di importare il valore originale del campo tot_hand.`);
    console.log(`\n   SOLUZIONE: Correggere i dati nel database usando i valori tot_hand dal file Excel.`);
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

verificaCalcoloTotHandExcel().catch(console.error);

