// src/app/page.tsx
import { getPartenzeData, Partenza } from "@/lib/data-partenze";

export default async function HomePage() {
  const partenze: Partenza[] = await getPartenzeData();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL; // <-- Leggiamo la variabile

  return (
    <div>
      <h1>Lista Partenze</h1>
      <p>
        URL pubblico dell'app: <strong>{appUrl}</strong>
      </p>
      <table className="table table-striped">
        {/* ...il resto della tua tabella... */}
      </table>
    </div>
  );
}