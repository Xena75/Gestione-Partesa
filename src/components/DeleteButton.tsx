// src/components/DeleteButton.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    // Chiediamo conferma prima di eliminare
    if (!confirm('Sei sicuro di voler eliminare questo viaggio?')) {
      return;
    }

    try {
      const response = await fetch(`/api/monitoraggio/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione');
      }

      alert('Viaggio eliminato con successo!');
      // Questo comando ricarica i dati della pagina in modo intelligente
      router.refresh(); 
      
    } catch (error) {
      console.error(error);
      alert('Si è verificato un errore.');
    }
  };

  return (
    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
      Elimina
    </button>
  );
}