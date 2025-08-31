// Store condiviso per il progresso (in produzione usare Redis o database)
export const importProgress = new Map<string, {
  progress: number;
  currentStep: string;
  completed: boolean;
  result?: {
    success: boolean;
    totalRows: number;
    importedRows: number;
    errors: string[];
    sessionId: string;
    duration: number;
  };
}>();
