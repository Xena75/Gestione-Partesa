import 'bootstrap/dist/css/bootstrap.min.css'; // Importa Bootstrap
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestione Partesa",
  description: "App per la gestione delle partese",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <div className="container">
            <a className="navbar-brand" href="/">
              Gestione Partesa
            </a>
          </div>
        </nav>

        <div className="container mt-4">
          {children} {/* Qui verranno caricate le tue pagine */}
        </div>
      </body>
    </html>
  );
}