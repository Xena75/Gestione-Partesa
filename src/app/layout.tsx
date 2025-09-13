// src/app/layout.tsx
import './globals.css';
import type { Metadata } from "next";
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: "Gestione Partesa - Dashboard",
  description: "Dashboard completa per la gestione di viaggi e logistica",
};

export default function RootLayout({ children, }: { children: React.ReactNode; }) {
  return (
    <html lang="it" data-scroll-behavior="smooth">
      <head>
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" 
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" 
          crossOrigin="anonymous"
          async
        ></script>
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <div className="w-100">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}