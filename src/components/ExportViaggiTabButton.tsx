'use client';

import React, { useState } from 'react';

interface ExportViaggiTabButtonProps {
  /** Stessa query della pagina (filtri, ordinamento; `page` è ignorato dall’API). */
  searchQueryKey: string;
  disabled?: boolean;
}

export default function ExportViaggiTabButton({
  searchQueryKey,
  disabled = false,
}: ExportViaggiTabButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const qs = searchQueryKey.trim();
      const url = qs ? `/api/viaggi/export?${qs}` : '/api/viaggi/export';
      const response = await fetch(url);

      if (!response.ok) {
        let errorMessage = `Errore ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // risposta non JSON
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `viaggi_tab_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(href);
    } catch (error) {
      console.error("Errore durante l'export:", error);
      const errorMessage =
        error instanceof Error ? error.message : 'Errore durante la generazione del file Excel.';
      alert(`Errore durante la generazione del file Excel:\n${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-success"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Generazione...
        </>
      ) : (
        <>
          <i className="bi bi-file-earmark-excel me-2" />
          Export Excel
        </>
      )}
    </button>
  );
}
