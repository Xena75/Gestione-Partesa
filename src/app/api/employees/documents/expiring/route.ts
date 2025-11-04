import { NextRequest, NextResponse } from 'next/server';
import { getExpiringDocuments, updateDocumentStatus } from '@/lib/db-employees';

// GET - Recupera tutti i documenti in scadenza
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    // Validazione parametro days
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Parametro days deve essere un numero tra 1 e 365' },
        { status: 400 }
      );
    }

    // Aggiorna lo status dei documenti prima di recuperarli
    await updateDocumentStatus();
    
    const expiringDocuments = await getExpiringDocuments(days);
    
    // Raggruppa i documenti multipli (fronte/retro) come un unico documento
    // Solo i documenti con marcatori (Fronte/Retro/Parte X) vengono raggruppati
    const documentGroups = new Map<string, typeof expiringDocuments>();
    
    expiringDocuments.forEach(doc => {
      const hasFrontBackMarker = /\(Fronte\)|\(Retro\)|\(Parte \d+\)/gi.test(doc.document_name);
      if (hasFrontBackMarker) {
        // Raggruppa solo documenti con marcatori espliciti
        const baseName = doc.document_name.replace(/ \(Fronte\)| \(Retro\)| \(Parte \d+\)/gi, '').trim();
        const groupKey = `${doc.employee_id}_${doc.document_type}_${doc.expiry_date || 'no_expiry'}_${baseName}`;
        
        if (!documentGroups.has(groupKey)) {
          documentGroups.set(groupKey, []);
        }
        documentGroups.get(groupKey)!.push(doc);
      } else {
        // Documenti senza marcatori sono trattati come documenti unici
        const uniqueKey = `${doc.employee_id}_${doc.document_type}_${doc.expiry_date || 'no_expiry'}_${doc.id}`;
        documentGroups.set(uniqueKey, [doc]);
      }
    });
    
    // Per ogni gruppo, prendi solo il primo documento (quello più recente o il primo in ordine)
    // e calcola i giorni alla scadenza dal primo documento del gruppo
    const uniqueDocuments = Array.from(documentGroups.values()).map(group => {
      // Ordina per data di creazione (più recente prima) e prendi il primo
      const sortedGroup = group.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      const mainDoc = sortedGroup[0];
      
      // Calcola days_until_expiry se non presente o se expiry_date è presente
      let daysUntilExpiry = mainDoc.days_until_expiry;
      if (mainDoc.expiry_date && (!daysUntilExpiry || daysUntilExpiry === 0)) {
        const expiryDate = new Date(mainDoc.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - today.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      // Se ci sono più file nel gruppo, aggiungi informazioni sui file multipli
      return {
        ...mainDoc,
        days_until_expiry: daysUntilExpiry || 0,
        isMultiFile: group.length > 1,
        fileCount: group.length,
        allFiles: group.length > 1 ? group.map(d => ({
          id: d.id,
          file_name: d.file_name,
          file_path: d.file_path,
          part: d.document_name.match(/\(Fronte\)|\(Retro\)|\(Parte (\d+)\)/i)?.[0] || 'Parte 1'
        })) : undefined
      };
    });
    
    // Trasforma i dati per il frontend della dashboard
    const transformedDocuments = uniqueDocuments.map(doc => ({
      id: doc.id,
      employee_id: doc.employee_id,
      employee_name: doc.employee_name || `${doc.nome || ''} ${doc.cognome || ''}`.trim(),
      nome: doc.nome,
      cognome: doc.cognome,
      document_type: doc.document_type,
      tipo_documento: doc.document_type, // Per compatibilità
      expiry_date: doc.expiry_date || '',
      data_scadenza: doc.expiry_date || '', // Per compatibilità
      days_until_expiry: doc.days_until_expiry || 0,
      giorni_alla_scadenza: doc.days_until_expiry || 0, // Per compatibilità
      document_name: doc.document_name.replace(/ \(Fronte\)| \(Retro\)| \(Parte \d+\)/gi, '').trim(),
      file_path: doc.file_path,
      file_name: doc.file_name,
      status: doc.status,
      isMultiFile: doc.isMultiFile || false,
      fileCount: doc.fileCount || 1,
      allFiles: doc.allFiles
    }));
    
    // Raggruppa i documenti per status (valori in italiano)
    const groupedDocuments = {
      scaduto: transformedDocuments.filter(doc => doc.status === 'scaduto'),
      in_scadenza: transformedDocuments.filter(doc => doc.status === 'in_scadenza'),
      valido: transformedDocuments.filter(doc => doc.status === 'valido'),
      da_rinnovare: transformedDocuments.filter(doc => doc.status === 'da_rinnovare')
    };

    // Statistiche
    const stats = {
      totale: transformedDocuments.length,
      scaduto: groupedDocuments.scaduto.length,
      in_scadenza: groupedDocuments.in_scadenza.length,
      valido: groupedDocuments.valido.length,
      da_rinnovare: groupedDocuments.da_rinnovare.length
    };

    return NextResponse.json({
      success: true,
      data: {
        documents: transformedDocuments,
        grouped: groupedDocuments,
        stats,
        days_filter: days
      }
    });

  } catch (error) {
    console.error('Errore nel recupero documenti in scadenza:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Aggiorna manualmente lo status di tutti i documenti
export async function POST(request: NextRequest) {
  try {
    await updateDocumentStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Status documenti aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento status documenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}