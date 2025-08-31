// src/app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata } from "next";
import Link from 'next/link'; // <-- 1. IMPORTA IL COMPONENTE LINK

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
            {/* -- 2. SOSTITUISCI <a> CON <Link> -- */}
            <Link className="navbar-brand" href="/">
              Gestione Partesa
            </Link>
          </div>
        </nav>

        <div className="container mt-4">
          {children}
        </div>
      </body>
    </html>
  );
}