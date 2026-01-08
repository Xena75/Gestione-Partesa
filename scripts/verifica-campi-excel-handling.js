const XLSX = require('xlsx');
const path = require('path');

async function verificaCampiExcel() {
  try {
    console.log('🔍 VERIFICA CAMPI FILE EXCEL PER IMPORT HANDLING\n');
    console.log('='.repeat(80));
    
    const excelPath = path.join(__dirname, '..', 'import', 'Mensili', 'handling importato.xlsx');
    console.log(`\n📂 Lettura file Excel: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`✅ File letto: ${data.length} righe\n`);
    
    if (data.length === 0) {
      console.log('❌ Il file Excel è vuoto!');
      return;
    }
    
    // Campi richiesti dall'API (dalla route.ts)
    const campiRichiesti = {
      // Campi obbligatori o importanti
      'source_name': 'source_name',
      'appalto': 'appalto',
      'bu': 'bu',
      'em_fatt': 'em_fatt',
      'rag_soc': 'rag_soc',
      'div': 'div',
      'mag': 'mag',
      'tmv': 'tmv',
      'tipo_movimento': 'tipo_movimento',
      'doc_mat': 'doc_mat',
      'esmat': 'esmat',
      'pos': 'pos',
      'materiale': 'materiale',
      'descrizione_materiale': 'descrizione_materiale',
      'gr_m': 'gr_m',
      'Comp.': 'comp', // Campo con caratteri speciali
      'oda': 'oda', // mappato a doc_acq
      'esmat_1': 'esmat_1',
      'cliente': 'cliente',
      'data_mov_m': 'data_mov_m',
      'quantita': 'quantita',
      'umo': 'umo',
      'qta_uma': 'qta_uma',
      'tipo_imb': 'tipo_imb',
      't_hf_umv': 't_hf_umv',
      'Imp. H. UM': 'imp_hf_um', // Campo con caratteri speciali
      'Imp.Resi V': 'imp_resi_v', // Campo con caratteri speciali
      'Imp. Doc.': 'imp_doc', // Campo con caratteri speciali
      'tot_hand': 'tot_hand',
      'mese': 'mese'
    };
    
    // Campi presenti nel file Excel
    const primaRiga = data[0];
    const campiPresenti = Object.keys(primaRiga);
    
    console.log(`📋 CAMPI PRESENTI NEL FILE EXCEL (${campiPresenti.length}):\n`);
    campiPresenti.forEach((campo, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${campo}`);
    });
    
    // Verifica corrispondenze
    console.log(`\n🔍 VERIFICA CORRISPONDENZE:\n`);
    
    const campiMancanti = [];
    const campiPresentiOk = [];
    const campiConNomiDiversi = [];
    
    Object.entries(campiRichiesti).forEach(([nomeExcel, nomeDb]) => {
      if (campiPresenti.includes(nomeExcel)) {
        campiPresentiOk.push({ excel: nomeExcel, db: nomeDb });
      } else {
        // Cerca varianti del nome
        const varianti = [
          nomeExcel.toLowerCase(),
          nomeExcel.toUpperCase(),
          nomeExcel.replace(/\./g, ''),
          nomeExcel.replace(/\s/g, '_'),
          nomeExcel.replace(/\s/g, ''),
          nomeDb,
          nomeDb.toUpperCase(),
          nomeDb.toLowerCase()
        ];
        
        const trovato = varianti.find(v => campiPresenti.some(c => 
          c.toLowerCase() === v.toLowerCase() || 
          c.replace(/\./g, '').replace(/\s/g, '_').toLowerCase() === v.toLowerCase()
        ));
        
        if (trovato) {
          const campoTrovato = campiPresenti.find(c => 
            c.toLowerCase() === trovato.toLowerCase() || 
            c.replace(/\./g, '').replace(/\s/g, '_').toLowerCase() === trovato.toLowerCase()
          );
          campiConNomiDiversi.push({ 
            richiesto: nomeExcel, 
            trovato: campoTrovato, 
            db: nomeDb 
          });
        } else {
          campiMancanti.push({ excel: nomeExcel, db: nomeDb });
        }
      }
    });
    
    // Risultati
    console.log(`✅ CAMPI PRESENTI E CORRETTI (${campiPresentiOk.length}):`);
    campiPresentiOk.forEach(c => {
      console.log(`   ✓ ${c.excel} → ${c.db}`);
    });
    
    if (campiConNomiDiversi.length > 0) {
      console.log(`\n⚠️  CAMPI CON NOMI DIVERSI (${campiConNomiDiversi.length}):`);
      campiConNomiDiversi.forEach(c => {
        console.log(`   ⚠ ${c.richiesto} → trovato come "${c.trovato}" → ${c.db}`);
      });
    }
    
    if (campiMancanti.length > 0) {
      console.log(`\n❌ CAMPI MANCANTI (${campiMancanti.length}):`);
      campiMancanti.forEach(c => {
        console.log(`   ✗ ${c.excel} (mappato a ${c.db})`);
      });
    }
    
    // Verifica campi opzionali ma importanti
    console.log(`\n📊 ANALISI CAMPI OPZIONALI MA IMPORTANTI:\n`);
    
    const campiOpzionali = ['source_name', 'mese', 'dep'];
    campiOpzionali.forEach(campo => {
      const trovato = campiPresenti.find(c => 
        c.toLowerCase() === campo.toLowerCase() || 
        c.replace(/\./g, '').replace(/\s/g, '_').toLowerCase() === campo.toLowerCase()
      );
      
      if (trovato) {
        const valori = data.slice(0, 10).map(row => row[trovato]).filter(v => v !== '' && v !== null && v !== undefined);
        console.log(`   ✓ ${campo}: presente come "${trovato}" (valori esempio: ${valori.slice(0, 3).join(', ')})`);
      } else {
        console.log(`   ⚠ ${campo}: NON trovato (verrà gestito automaticamente)`);
      }
    });
    
    // Verifica valori di esempio per campi critici
    console.log(`\n📋 VALORI DI ESEMPIO (prima riga):\n`);
    const campiCritici = ['doc_mat', 'materiale', 'tot_hand', 'mese', 'div', 'data_mov_m'];
    campiCritici.forEach(campo => {
      const campoExcel = campiPresenti.find(c => 
        c.toLowerCase() === campo.toLowerCase() || 
        c.replace(/\./g, '').replace(/\s/g, '_').toLowerCase() === campo.toLowerCase()
      );
      
      if (campoExcel) {
        const valore = primaRiga[campoExcel];
        console.log(`   ${campo}: "${valore}" (tipo: ${typeof valore})`);
      } else {
        console.log(`   ${campo}: NON TROVATO`);
      }
    });
    
    // Conclusione
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n💡 CONCLUSIONE:`);
    
    if (campiMancanti.length === 0) {
      console.log(`\n✅ Il file Excel contiene tutti i campi necessari!`);
      console.log(`   Puoi procedere con l'import tramite l'applicazione web.`);
    } else {
      console.log(`\n⚠️  ATTENZIONE:`);
      console.log(`   Ci sono ${campiMancanti.length} campi mancanti.`);
      console.log(`   L'import potrebbe non funzionare correttamente.`);
      console.log(`\n   Campi mancanti critici:`);
      campiMancanti.forEach(c => {
        console.log(`   - ${c.excel}`);
      });
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Errore:', error);
    if (error.code === 'ENOENT') {
      console.error(`\n⚠️  File non trovato: ${excelPath}`);
      console.error(`   Verifica che il file esista nella cartella import/Mensili/`);
    }
  }
}

verificaCampiExcel().catch(console.error);

