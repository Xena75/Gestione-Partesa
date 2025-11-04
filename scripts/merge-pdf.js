#!/usr/bin/env node
// Script separato per unire file PDF
// Questo script viene eseguito come processo child e non viene analizzato da Turbopack

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function imageToPdf(imageBuffer, mimeType) {
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

async function mergeFilesToPdf(filePaths) {
  const pdfDoc = await PDFDocument.create();

  for (const filePath of filePaths) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    let pdfBytes;
    if (fileExt === '.pdf') {
      pdfBytes = new Uint8Array(fileBuffer);
    } else if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
      const mimeType = fileExt === '.png' ? 'image/png' : 'image/jpeg';
      pdfBytes = await imageToPdf(fileBuffer, mimeType);
    } else {
      throw new Error(`Tipo file non supportato: ${fileExt}`);
    }

    const sourcePdf = await PDFDocument.load(pdfBytes);
    const pages = await pdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach((page) => {
      pdfDoc.addPage(page);
    });
  }

  const mergedPdfBytes = await pdfDoc.save();
  return Buffer.from(mergedPdfBytes);
}

// Legge i file da unire dagli argomenti della riga di comando
// Gli argomenti sono: file1 file2 ... fileN outputPath
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error(JSON.stringify({ success: false, error: 'Servono almeno 2 argomenti: file1 file2 ... outputPath' }));
  process.exit(1);
}

// L'ultimo argomento è il percorso di output
const outputPath = args[args.length - 1];
// Tutti gli altri sono i file da unire
const filePaths = args.slice(0, -1);

if (filePaths.length === 0) {
  console.error(JSON.stringify({ success: false, error: 'Nessun file da unire' }));
  process.exit(1);
}

console.log(`Unendo ${filePaths.length} file in ${outputPath}`);

mergeFilesToPdf(filePaths)
  .then((mergedBuffer) => {
    fs.writeFileSync(outputPath, mergedBuffer);
    console.log(JSON.stringify({ success: true, outputPath, size: mergedBuffer.length }));
    process.exit(0);
  })
  .catch((error) => {
    console.error(JSON.stringify({ success: false, error: error.message, stack: error.stack }));
    process.exit(1);
  });

