// src/app/page.tsx
import { getViaggiData, Viaggio } from "@/lib/data-viaggi";
import DeleteButton from "@/components/DeleteButton";
import Link from 'next/link';

export default async function HomePage() {
  const viaggi: Viaggio[] = await getViaggiData();

  return (
    <div>
      <h1>Lista Viaggi</h1>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Deposito</th>
            <th>Data e Ora Inizio</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {/* La mappatura ora è più compatta per evitare spazi bianchi */}
          {viaggi.map((viaggio) => (
            <tr key={viaggio.id}>
              <td>{viaggio.deposito}</td>
              <td>{new Date(viaggio.dataOraInizioViaggio).toLocaleString('it-IT')}</td>
              <td className="d-flex gap-2">
                <Link href={`/viaggi/${viaggio.id}/modifica`} className="btn btn-secondary btn-sm">
                  Modifica
                </Link>
                <DeleteButton id={viaggio.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}