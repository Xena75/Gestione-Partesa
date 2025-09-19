console.log('Cercando viaggio 57165...');

fetch('http://localhost:3001/api/viaggi?search=57165')
  .then(r => r.json())
  .then(d => {
    console.log('Risultati ricerca per 57165:');
    console.log('Struttura risposta:', Object.keys(d));
    
    if (d.viaggi && d.viaggi.length > 0) {
      console.log(`Trovati ${d.viaggi.length} risultati:`);
      d.viaggi.forEach((v, i) => {
        console.log(`${i+1}. Viaggio: ${v.Viaggio}, Data: ${v.Data}`);
      });
    } else {
      console.log('❌ Nessun risultato trovato per 57165');
    }
  })
  .catch(e => console.error('Error:', e));