// nel tuo file della pagina del form
'use client'; 

import { useState } from 'react';

export default function NuovoViaggioPage() {
  // Aggiorniamo i nomi degli stati per chiarezza
  const [deposito, setDeposito] = useState('');
  const [data, setData] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      // Inviamo l'oggetto con i nomi corretti
      const response = await fetch('/api/viaggi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deposito, data }),
      });
      if (!response.ok) {
        throw new Error('Errore nel salvataggio del viaggio');
      }
      const result = await response.json();
      alert('Successo: ' + result.message);
      window.location.href = '/'; 
    } catch (error) {
      console.error(error);
      alert('Si è verificato un errore.');
    }
  };

  return (
    <div>
      <h1>Aggiungi Nuovo Viaggio</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="deposito" className="form-label">Deposito</label>
          <input
            type="text"
            className="form-control"
            id="deposito"
            value={deposito}
            onChange={(e) => setDeposito(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="data" className="form-label">Data e Ora Inizio</label>
          <input
            type="datetime-local" // Usiamo datetime-local per la colonna datetime
            className="form-control"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Salva</button>
      </form>
    </div>
  );
}