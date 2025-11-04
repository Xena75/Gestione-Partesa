#!/usr/bin/env node
// Script separato per unire file PDF scaricati da URL Vercel Blob
// Questo script viene eseguito come processo child e non viene analizzato da Turbopack

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Carica pdf-lib - ora che NODE_PATH è impostato nello spawn, dovrebbe funzionare
const { PDFDocument } = require('pdf-lib');

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Errore nel download: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

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

async function mergeFilesFromUrls(urls, outputPath) {
  const pdfDoc = await PDFDocument.create();

  for (const url of urls) {
    console.log(`Scaricando e processando: ${url}`);
    
    // Scarica il file dall'URL
    const fileBuffer = await downloadFile(url);
    
    // Determina il tipo di file dall'URL o dal contenuto
    const urlLower = url.toLowerCase();
    let pdfBytes;
    
    if (urlLower.includes('.pdf') || urlLower.endsWith('.pdf')) {
      // È un PDF
      pdfBytes = new Uint8Array(fileBuffer);
    } else if (urlLower.includes('.png') || urlLower.endsWith('.png')) {
      // È un PNG
      pdfBytes = await imageToPdf(fileBuffer, 'image/png');
    } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) {
      // È un JPEG
      pdfBytes = await imageToPdf(fileBuffer, 'image/jpeg');
    } else {
      // Prova a determinare dal contenuto
      const firstBytes = fileBuffer.slice(0, 4);
      if (firstBytes[0] === 0x25 && firstBytes[1] === 0x50 && firstBytes[2] === 0x44 && firstBytes[3] === 0x46) {
        // PDF magic number
        pdfBytes = new Uint8Array(fileBuffer);
      } else if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        // PNG magic number
        pdfBytes = await imageToPdf(fileBuffer, 'image/png');
      } else if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8) {
        // JPEG magic number
        pdfBytes = await imageToPdf(fileBuffer, 'image/jpeg');
      } else {
        throw new Error(`Tipo file non supportato per URL: ${url}`);
      }
    }

    const sourcePdf = await PDFDocument.load(pdfBytes);
    const pages = await pdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach((page) => {
      pdfDoc.addPage(page);
    });
  }

  const mergedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  return Buffer.from(mergedPdfBytes);
}

// Legge gli URL degli argomenti della riga di comando
// Gli argomenti sono: url1 url2 ... urlN outputPath
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error(JSON.stringify({ success: false, error: 'Servono almeno 2 argomenti: url1 url2 ... urlN outputPath' }));
  process.exit(1);
}

// L'ultimo argomento è il percorso di output
const outputPath = args[args.length - 1];
// Tutti gli altri sono gli URL dei file da scaricare e unire
const urls = args.slice(0, -1);

if (urls.length === 0) {
  console.error(JSON.stringify({ success: false, error: 'Nessun URL da processare' }));
  process.exit(1);
}

console.log(`Scaricando e unendo ${urls.length} file da URL in ${outputPath}`);

mergeFilesFromUrls(urls, outputPath)
  .then((mergedBuffer) => {
    console.log(JSON.stringify({ success: true, outputPath, size: mergedBuffer.length }));
    process.exit(0);
  })
  .catch((error) => {
    console.error(JSON.stringify({ success: false, error: error.message, stack: error.stack }));
    process.exit(1);
  });

