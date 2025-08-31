// src/app/page.tsx
import { getPartenzeData, Partenza } from "@/lib/data";

export default async function HomePage() {
  const partenze: Partenza[] = await getPartenzeData();

  return (
    <div>
      <h1>Lista Partenze</h1>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Destinazione</th>
            <th>Data</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {partenze.map((partenza) => (
            <tr key={partenza.id}>
              <td>{partenza.destinazione}</td>
              <td>{partenza.data}</td>
              <td>{partenza.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}