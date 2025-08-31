'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type SortableHeaderProps = {
  field: string;
  label: string;
  currentSortBy: string;
  currentSortOrder: 'ASC' | 'DESC';
};

export default function SortableHeader({ field, label, currentSortBy, currentSortOrder }: SortableHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = () => {
    const params = new URLSearchParams(searchParams.toString());
    
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
    
    router.push(`/?${params.toString()}`);
  };

  const getSortIcon = () => {
    if (currentSortBy !== field) {
      return '↕️'; // Icona neutra per colonne non ordinate
    }
    return currentSortOrder === 'ASC' ? '▲' : '▼';
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
