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
    
    // Se clicchiamo sulla stessa colonna, invertiamo l'ordine
    if (currentSortBy === field) {
      const newOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
      params.set('sortOrder', newOrder);
    } else {
      // Se clicchiamo su una nuova colonna, impostiamo l'ordine di default (ASC)
      params.set('sortBy', field);
      params.set('sortOrder', 'ASC');
    }
    
    // Reset alla prima pagina quando cambiamo ordinamento
    params.set('page', '1');
    
    router.push(`${basePath}?${params.toString()}`);
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
