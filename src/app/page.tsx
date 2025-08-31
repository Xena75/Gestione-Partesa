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
            <th>Deposito</th>
            <th>Data e Ora Inizio</th>
          </tr>
        </thead>
        <tbody>
          {viaggi.map((viaggio) => (
            <tr key={viaggio.id}>
              <td>{viaggio.deposito}</td>
              {/* ECCO LA CORREZIONE: La data viene trasformata in testo */}
              <td>{new Date(viaggio.dataOraInizioViaggio).toLocaleString('it-IT')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}