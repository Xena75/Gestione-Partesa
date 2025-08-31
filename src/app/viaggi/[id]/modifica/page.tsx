// src/app/viaggi/[id]/modifica/page.tsx
import { getViaggioById } from "@/lib/data-viaggi";
import EditViaggioForm from "@/components/EditViaggioForm";

// La firma della funzione rimane la stessa, la logica interna è già corretta
export default async function ModificaViaggioPage({ params }: { params: { id: string } }) {
  // Ci assicuriamo che l'ID sia un numero valido prima di usarlo
  const id = Number(params.id);

  // Controlliamo se l'ID non è un numero valido
  if (isNaN(id)) {
    return <div>ID del viaggio non valido.</div>;
  }

  const viaggio = await getViaggioById(id);

  if (!viaggio) {
    return <div>Viaggio non trovato.</div>;
  }

  return (
    <div>
      <h1>Modifica Viaggio</h1>
      <EditViaggioForm viaggio={viaggio} />
    </div>
  );
}
