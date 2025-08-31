// src/app/partenze/nuova/page.tsx
'use client'; 

import { useState } from 'react';

export default function NuovaPartenzaPage() {
  const [destinazione, setDestinazione] = useState('');
  const [data, setData] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      const response = await fetch('/api/partenze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destinazione, data, note }),
      });

      if (!response.ok) {
        throw new Error('Errore nel salvataggio della partenza');
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
      <h1>Aggiungi Nuova Partenza</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="destinazione" className="form-label">Destinazione</label>
          <input
            type="text"
            className="form-control"
            id="destinazione"
            value={destinazione}
            onChange={(e) => setDestinazione(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="data" className="form-label">Data</label>
          <input
            type="date"
            className="form-control"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="note" className="form-label">Note</label>
          <textarea
            className="form-control"
            id="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          ></textarea>
        </div>
        <button type="submit" className="btn btn-primary">Salva</button>
      </form>
    </div>
  );
}