// src/app/page.tsx
import { getViaggiData, Viaggio } from "@/lib/data-viaggi";
import DeleteButton from "@/components/DeleteButton";
import Link from 'next/link';

export default async function HomePage() {
  const viaggi: Viaggio[] = await getViaggiData();

  return (
    <div className="vh-100 d-flex flex-column p-4">
      <div className="flex-grow-1">
        <h1 className="mb-3">Lista Viaggi</h1>
        <div className="table-responsive h-100">
          <table className="table table-striped table-sm table-hover mb-0">
                      <thead>
              <tr>
                <th>ID</th>
                <th>Deposito</th>
                <th>Numero Viaggio</th>
                <th>Nominativo</th>
                <th>Affiancato Da</th>
                <th>Totale Colli</th>
                <th>Data Inizio</th>
                <th>Data Fine</th>
                <th>Targa Mezzo</th>
                <th>Km Iniziali</th>
                <th>Km Finali</th>
                <th>Km Rifornimento</th>
                <th>Litri Riforniti</th>
                <th>Euro/Litro</th>
                <th>Ritiri</th>
                <th>Km Effettivi</th>
                <th>Ore Effettive</th>
                <th>Created At</th>
                <th>Azioni</th>
              </tr>
            </thead>
          <tbody>
                          {viaggi.map((viaggio) => (
                <tr key={viaggio.id}>
                  <td>{viaggio.id}</td>
                  <td>{viaggio.deposito}</td>
                  <td>{viaggio.numeroViaggio}</td>
                  <td>{viaggio.nominativoId || '-'}</td>
                  <td>{viaggio.affiancatoDaId || '-'}</td>
                  <td>{viaggio.totaleColli || '-'}</td>
                  <td>{viaggio.dataOraInizioViaggio ? new Date(viaggio.dataOraInizioViaggio).toLocaleString('it-IT') : '-'}</td>
                  <td>{viaggio.dataOraFineViaggio ? new Date(viaggio.dataOraFineViaggio).toLocaleString('it-IT') : '-'}</td>
                  <td>{viaggio.targaMezzoId || '-'}</td>
                  <td>{viaggio.kmIniziali || '-'}</td>
                  <td>{viaggio.kmFinali || '-'}</td>
                  <td>{viaggio.kmAlRifornimento || '-'}</td>
                  <td>{viaggio.litriRiforniti || '-'}</td>
                  <td>{viaggio.euroLitro || '-'}</td>
                  <td>{viaggio.haiEffettuatoRitiri ? 'Sì' : 'No'}</td>
                  <td>{viaggio.kmEffettivi || '-'}</td>
                  <td>{viaggio.oreEffettive || '-'}</td>
                  <td>{viaggio.createdAt ? new Date(viaggio.createdAt).toLocaleString('it-IT') : '-'}</td>
                  <td className="d-flex gap-1">
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
      </div>
    </div>
  );
}