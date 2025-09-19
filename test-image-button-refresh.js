// Script per testare il refresh forzato della cache del componente ImageButton
// per il viaggio 57165

console.log('🧪 Test refresh cache ImageButton per viaggio 57165');
console.log('=' .repeat(60));

// Test 1: Verifica API diretta
console.log('\n📡 Test 1: Chiamata API diretta');
fetch('http://localhost:3001/api/viaggi/images/count?numeroViaggio=57165')
  .then(response => {
    console.log('Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('✅ Risposta API:', data);
    console.log('🔢 Count:', data.count, 'tipo:', typeof data.count);
  })
  .catch(error => {
    console.error('❌ Errore API:', error);
  });

// Test 2: Simulazione refresh cache
console.log('\n🔄 Test 2: Simulazione refresh cache');
console.log('Per testare il refresh della cache, apri la console del browser e esegui:');
console.log('\n// Importa la funzione di refresh');
console.log('import { forceRefreshImageCount } from "./src/components/ImageButton";');
console.log('\n// Forza il refresh per il viaggio 57165');
console.log('forceRefreshImageCount("57165").then(count => {');
console.log('  console.log("Nuovo conteggio:", count);');
console.log('});');

console.log('\n📋 Istruzioni per il test manuale:');
console.log('1. Apri il browser su http://localhost:3001');
console.log('2. Cerca il viaggio 57165 nella lista');
console.log('3. Apri la console del browser (F12)');
console.log('4. Esegui il comando di refresh della cache');
console.log('5. Ricarica la pagina e verifica se il pulsante mostra "1 Immagini"');

console.log('\n🎯 Risultato atteso: Il pulsante dovrebbe mostrare "1 Immagini" invece di "Nessuna immagine"');