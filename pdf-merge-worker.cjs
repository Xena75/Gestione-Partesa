// File CommonJS nella root per gestire il merge PDF
// Questo file viene caricato usando percorso assoluto per evitare analisi di Turbopack

const path = require('path');
const fs = require('fs');

/**
 * Carica pdf-lib usando il percorso assoluto diretto
 */
function loadPdfLib() {
  // Usa process.cwd() per ottenere la root del progetto
  const projectRoot = process.cwd();
  const sep = path.sep;
  
  // Costruisci il percorso a node_modules/pdf-lib/cjs/index.js dalla root del progetto
  const pdfLibPath = projectRoot + sep + 'node_modules' + sep + 'pdf-lib' + sep + 'cjs' + sep + 'index.js';
  
  console.log('Tentativo di caricare pdf-lib da:', pdfLibPath);
  console.log('File esiste?', fs.existsSync(pdfLibPath));
  
  // Verifica che il file esista
  if (fs.existsSync(pdfLibPath)) {
    // Usa require diretto con il percorso assoluto
    return require(pdfLibPath);
  }
  
  // Fallback: prova con require normale
  try {
    const moduleName = ['pdf', '-', 'lib'].join('');
    console.log('Tentativo fallback con require normale:', moduleName);
    return require(moduleName);
  } catch (e) {
    throw new Error('pdf-lib non trovato in: ' + pdfLibPath + '. Errore: ' + e.message);
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
