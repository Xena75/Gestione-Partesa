// src/app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata } from "next";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Gestione Viaggi", // Titolo aggiornato
  description: "App per la gestione dei viaggi e logistica",
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
            <Link className="navbar-brand" href="/">
              Gestione Viaggi
            </Link>
            <div className="navbar-nav">
              {/* LINK ALLA NUOVA PAGINA */}
              <Link className="nav-link" href="/gestione">
                Gestione Logistica
              </Link>
              <Link className="nav-link" href="/funzionalita">
                Funzionalità
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mt-4">
          {children}
        </div>
      </body>
    </html>
  );
}