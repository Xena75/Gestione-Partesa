// File CommonJS per gestire il merge PDF
// Questo file viene caricato come modulo separato per evitare problemi con Turbopack

const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');

/**
 * Carica pdf-lib usando createRequire per evitare analisi statica
 */
function loadPdfLib() {
  try {
    // Usa createRequire per creare un nuovo contesto di require
    // Questo dovrebbe evitare che Turbopack analizzi il modulo
    const requirePdf = createRequire(__filename);
    
    // Costruisci il nome del modulo dinamicamente
    const moduleName = ['pdf', '-', 'lib'].join('');
    
    try {
      return requirePdf(moduleName);
    } catch (e1) {
      // Se fallisce, prova con il percorso assoluto usando createRequire
      const cwd = process.cwd();
      const sep = path.sep;
      const pdfLibPath = cwd + sep + 'node_modules' + sep + moduleName + sep + 'cjs' + sep + 'index.js';
      
      if (fs.existsSync(pdfLibPath)) {
        return requirePdf(pdfLibPath);
      }
      
      // Ultimo tentativo: require normale
      // eslint-disable-next-line no-eval
      const req = eval('require');
      return req(moduleName);
    }
  } catch (e) {
    throw new Error('pdf-lib non trovato. Verifica che sia installato: npm install pdf-lib. Errore: ' + e.message);
  }
}

/**
 * Converte un'immagine Buffer in PDF
 */
async function imageToPdf(imageBuffer, mimeType) {
  const pdfLib = loadPdfLib();
  const { PDFDocument } = pdfLib;
  const pdfDoc = await PDFDocument.create();
  
  let image;
  if (mimeType === 'image/png') {
    image = await pdfDoc.embedPng(imageBuffer);
  } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBuffer);
  } else {
    throw new Error('Tipo immagine non supportato. Usa PNG o JPG');
  }
  
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });
  
  return await pdfDoc.save();
}

/**
 * Unisce più file (immagini o PDF) in un singolo PDF
 */
async function mergeFilesToPdf(fileBuffers) {
  const pdfLib = loadPdfLib();
  const { PDFDocument } = pdfLib;
  
  if (fileBuffers.length === 1) {
    if (fileBuffers[0].mimeType === 'application/pdf') {
      return fileBuffers[0].buffer;
    }
    const pdfBytes = await imageToPdf(fileBuffers[0].buffer, fileBuffers[0].mimeType);
    return Buffer.from(pdfBytes);
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of fileBuffers) {
    let pdfBytes;
    if (file.mimeType === 'application/pdf') {
      pdfBytes = new Uint8Array(file.buffer);
    } else {
      pdfBytes = await imageToPdf(file.buffer, file.mimeType);
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    pages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  const mergedPdfBytes = await mergedPdf.save();
  return Buffer.from(mergedPdfBytes);
}

module.exports = {
  mergeFilesToPdf,
  imageToPdf
};

