'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortableHeaderProps = {
  field: string;
  label: string;
  currentSortBy: string;
  currentSortOrder: 'ASC' | 'DESC';
  basePath?: string;
};

export default function SortableHeader({ field, label, currentSortBy, currentSortOrder, basePath = '/viaggi' }: SortableHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Normalizza l'ordine corrente (accetta sia uppercase che lowercase)
    const normalizedOrder = currentSortOrder.toUpperCase();
    
    // Se clicchiamo sulla stessa colonna, invertiamo l'ordine
    if (currentSortBy === field) {
      const newOrder = normalizedOrder === 'ASC' ? 'desc' : 'asc';
      params.set('sortOrder', newOrder);
    } else {
      // Se clicchiamo su una nuova colonna, impostiamo l'ordine di default (asc)
      params.set('sortBy', field);
      params.set('sortOrder', 'asc');
    }
    
    // Reset alla prima pagina quando cambiamo ordinamento (solo se esiste il parametro page)
    if (params.has('page')) {
      params.set('page', '1');
    }
    
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  };

  const getSortIcon = () => {
    if (currentSortBy !== field) {
      return <ArrowUpDown size={16} className="text-muted" />; // Icona neutra per colonne non ordinate
    }
    return currentSortOrder === 'ASC' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  return (
    <th 
      onClick={handleSort}
      className="cursor-pointer user-select-none"
      style={{ cursor: 'pointer' }}
    >
      <div className="d-flex align-items-center justify-content-between">
        <span>{label}</span>
        <span className="ms-1">{getSortIcon()}</span>
      </div>
    </th>
  );
}
