// src/app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata } from "next";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Gestione Viaggi",
  description: "App per la gestione dei viaggi e logistica",
};

export default function RootLayout({ children, }: { children: React.ReactNode; }) {
  return (
    <html lang="it">
      <body>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <div className="container">
            <Link className="navbar-brand" href="/">
              Gestione Partesa
            </Link>
            <div className="navbar-nav">
              <Link className="nav-link" href="/gestione">
                Gestione Logistica
              </Link>
            </div>
          </div>
        </nav>
        <div className="container-fluid p-0">
          {children}
        </div>
      </body>
    </html>
  );
}