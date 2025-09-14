// src/components/DeleteButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteButton({ id, apiEndpoint }: { id: string; apiEndpoint: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    // Chiediamo conferma prima di eliminare
    if (!confirm('Sei sicuro di voler eliminare questo viaggio?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${apiEndpoint}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione');
      }

      // Rimuovi l'elemento dalla pagina immediatamente
      const rowElement = document.querySelector(`[data-viaggio-id="${id}"]`);
      if (rowElement) {
        rowElement.remove();
      }

      // Aggiorna anche la pagina per sicurezza
      router.refresh();
      
      alert('Viaggio eliminato con successo!');
      
    } catch (error) {
      console.error(error);
      alert('Si è verificato un errore.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button 
      className="btn btn-danger btn-sm" 
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? 'Eliminazione...' : 'Elimina'}
    </button>
  );
}