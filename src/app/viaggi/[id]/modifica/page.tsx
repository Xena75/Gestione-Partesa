// src/app/viaggi/[id]/modifica/page.tsx
import { getViaggioById } from "@/lib/data-viaggi";
import EditViaggioForm from "@/components/EditViaggioForm";

export default async function ModificaViaggioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
