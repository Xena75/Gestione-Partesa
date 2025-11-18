'use client';

import React, { useState } from 'react';

interface HandlingFilters {
  bu?: string;
  div?: string;
  dep?: string;
  tipo_movimento?: string;
  doc_acq?: string;
  data_mov_m?: string;
  tipo_imb?: string;
  mese?: string;
}

interface ExportHandlingButtonProps {
  filters: HandlingFilters;
  disabled?: boolean;
}

export default function ExportHandlingButton({ filters, disabled = false }: ExportHandlingButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => 
          value !== undefined && value !== null && value !== '' && value !== 'Tutti' && value !== 'Tutte'
        )
      );

      const queryParams = new URLSearchParams(cleanFilters as Record<string, string>).toString();
      const response = await fetch(`/api/handling/export?${queryParams}`);

      if (!response.ok) {
        let errorMessage = `Errore ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se la risposta non è JSON, usa il messaggio di default
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `handling_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore durante l\'export:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore durante la generazione del file Excel.';
      alert(`Errore durante la generazione del file Excel:\n${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-success me-2"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Generazione...
        </>
      ) : (
        <>
          <i className="bi bi-file-earmark-excel me-2"></i>
          Export Excel
        </>
      )}
    </button>
  );
}