fetch('http://localhost:3001/api/viaggi?page=1&limit=20')
  .then(r => r.json())
  .then(data => {
    console.log('Viaggi nella prima pagina:');
    data.viaggi.forEach((v, i) => {
      console.log(`${i+1}. Viaggio ${v.Viaggio} - ${v.DataViaggio}`);
    });
    
    const found = data.viaggi.find(v => v.Viaggio === '57165');
    console.log(found ? 'Viaggio 57165 TROVATO nella prima pagina' : 'Viaggio 57165 NON TROVATO nella prima pagina');
    
    if (found) {
      console.log('Dettagli viaggio 57165:', found);
    }
  })
  .catch(e => console.error('Errore:', e));