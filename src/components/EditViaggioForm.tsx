// src/components/EditViaggioForm.tsx
'use client';

import type { Viaggio } from "@/lib/data-viaggi";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditViaggioForm({ viaggio }: { viaggio: Viaggio }) {
  const router = useRouter();
  const [deposito, setDeposito] = useState('');
  const [data, setData] = useState('');

  // Pre-compiliamo il form quando il componente viene caricato
  useEffect(() => {
    if (viaggio) {
      setDeposito(viaggio.deposito);
      // Formattiamo la data per l'input datetime-local
      const formattedDate = viaggio.dataOraInizioViaggio ? new Date(viaggio.dataOraInizioViaggio).toISOString().slice(0, 16) : '';
      setData(formattedDate);
    }
  }, [viaggio]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch(`/api/viaggi/${viaggio.id}`, {
        method: 'PUT', // Usiamo PUT per l'aggiornamento
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposito: deposito, dataOraInizioViaggio: data }),
      });

      if (!response.ok) throw new Error("Errore nell'aggiornamento");
      
      alert('Viaggio aggiornato con successo!');
      router.push('/'); // Torna alla homepage
      router.refresh(); // Forza l'aggiornamento dei dati
    } catch (error) {
      console.error(error);
      alert('Si è verificato un errore.');
    }
  };

  return (
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
            type="datetime-local"
            className="form-control"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Salva Modifiche</button>
    </form>
  );
}
