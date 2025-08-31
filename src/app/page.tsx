// src/app/page.tsx
import { getViaggiData, Viaggio } from "@/lib/data-viaggi";
import DeleteButton from "@/components/DeleteButton"; // <-- 1. IMPORTA IL PULSANTE

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
            <th>Azioni</th> {/* <-- 2. AGGIUNGI LA COLONNA AZIONI */}
          </tr>
        </thead>
        <tbody>
          {viaggi.map((viaggio) => (
            <tr key={viaggio.id}>
              <td>{viaggio.deposito}</td>
              <td>{new Date(viaggio.dataOraInizioViaggio).toLocaleString('it-IT')}</td>
              <td>
                {/* 3. AGGIUNGI IL COMPONENTE PULSANTE */}
                <DeleteButton id={viaggio.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}