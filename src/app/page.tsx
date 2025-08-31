// src/app/page.tsx
import { getViaggiData, Viaggio } from "@/lib/data-viaggi";

export default async function HomePage() {
  const viaggi: Viaggio[] = await getViaggiData();

  return (
    <div>
      <h1>Lista Viaggi</h1>
      <table className="table table-striped">
        <thead>
          <tr>
            {/* Colonne aggiornate */}
            <th>Deposito</th>
            <th>Data e Ora Inizio</th>
          </tr>
        </thead>
        <tbody>
          {viaggi.map((viaggio) => (
            <tr key={viaggio.id}>
              {/* Dati aggiornati */}
              <td>{viaggio.deposito}</td>
              <td>{viaggio.dataOraInizioViaggio}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}