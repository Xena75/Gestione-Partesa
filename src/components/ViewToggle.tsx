'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ViewToggleProps {
  viewType: 'grouped' | 'detailed';
  setViewType: (type: 'grouped' | 'detailed') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewType, setViewType }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentView = searchParams?.get('viewType') || viewType;

  useEffect(() => {
    setViewType(currentView as 'grouped' | 'detailed');
  }, [currentView, setViewType]);

  const switchView = (newView: 'grouped' | 'detailed') => {
    setViewType(newView);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('viewType', newView);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-2 sm:space-y-0">
      {/* Removed "Mostra Tabella" and "Nascondi Tabella" buttons */}
      <div className="flex space-x-2">
        <button
          type="button"
          className={`btn ${currentView === 'grouped' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => switchView('grouped')}
        >
          Vista Raggruppata
        </button>
        <button
          type="button"
          className={`btn ${currentView === 'detailed' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => switchView('detailed')}
        >
          Vista Dettagliata
        </button>
      </div>
    </div>
  );
};

export default ViewToggle;
