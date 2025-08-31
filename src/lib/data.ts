// src/lib/data.ts

// Definiamo un tipo per i nostri dati
export type Partenza = {
    id: number;
    destinazione: string;
    data: string;
    note: string;
  };
  
  // La nostra funzione per ottenere i dati
  export async function getPartenzeData(): Promise<Partenza[]> {
    const partenze = [
      { id: 1, destinazione: 'Milano', data: '2025-09-15', note: 'Cliente A' },
      { id: 2, destinazione: 'Roma', data: '2025-09-18', note: 'Cliente B' },
      { id: 3, destinazione: 'Napoli', data: '2025-09-22', note: 'Urgente' },
    ];
  
    // In futuro, qui ci sarà la chiamata al vero database
    return partenze;
  }