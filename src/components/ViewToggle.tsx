'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export default function ViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentView = searchParams.get('viewType') || 'grouped';

  const switchView = useCallback((viewType: 'grouped' | 'detailed') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('viewType', viewType);
    params.set('page', '1'); // Reset alla prima pagina quando si cambia vista
    
    router.push(`/gestione?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="d-flex justify-content-center mb-4">
      <div className="btn-group" role="group">
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
}
