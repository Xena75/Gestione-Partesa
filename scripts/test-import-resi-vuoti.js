const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configurazione
const API_URL = process.env.API_URL || 'http://localhost:3001';
const EXCEL_FILE = path.join(__dirname, '..', 'import', 'Resi_vuoti_non_pagati_format.xlsx');
const USERNAME = process.env.TEST_USERNAME || 'admin';
const PASSWORD = process.env.TEST_PASSWORD || 'admin';

// Funzione helper per fare richieste HTTP
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, statusText: res.statusMessage, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, statusText: res.statusMessage, data: responseData });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      if (data instanceof FormData) {
        data.pipe(req);
      } else {
        req.write(data);
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function login() {
  console.log('🔐 Login...');
  const url = new URL(`${API_URL}/api/auth/login`);
  const loginData = JSON.stringify({ username: USERNAME, password: PASSWORD });
  
  const response = await httpRequest({
    hostname: url.hostname,
    port: url.port || 3001,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);
  
  if (response.status === 200 && response.data.success) {
    // Estrai token dal cookie o dalla risposta
    const token = response.data.token || response.data.user?.token;
    if (token) {
      console.log('✅ Login effettuato\n');
      return token;
    }
  }
  
  throw new Error(`Login fallito: ${response.data.message || 'Token non trovato'}`);
}

async function testImport() {
  try {
    console.log('🧪 Test import Resi e Vuoti Non Fatturati');
    console.log('='.repeat(70));
    
    // Verifica che il file esista
    if (!fs.existsSync(EXCEL_FILE)) {
      console.error(`❌ File non trovato: ${EXCEL_FILE}`);
      process.exit(1);
    }
    
    console.log(`📄 File Excel: ${EXCEL_FILE}`);
    console.log(`🌐 API URL: ${API_URL}/api/resi-vuoti/import\n`);
    
    // Login per ottenere token
    const token = await login();
    
    // Crea FormData con il file
    const formData = new FormData();
    formData.append('file', fs.createReadStream(EXCEL_FILE), {
      filename: 'Resi_vuoti_non_pagati_format.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('📤 Invio richiesta all\'API...');
    const startTime = Date.now();
    
    // Prepara headers con token
    const headers = formData.getHeaders();
    headers['Authorization'] = `Bearer ${token}`;
    
    // Usa http nativo per la richiesta
    const url = new URL(`${API_URL}/api/resi-vuoti/import`);
    const response = await httpRequest({
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'POST',
      headers: headers
    }, formData);
    
    const result = response.data;
    
    const duration = Date.now() - startTime;
    
    console.log(`\n📥 Risposta ricevuta (${duration}ms):`);
    console.log('='.repeat(70));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Success: ${result.success}`);
    
    if (result.success) {
      console.log(`✅ Righe importate: ${result.imported}`);
      console.log(`📊 Totale righe nel file: ${result.total}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errori riscontrati (${result.errors.length}):`);
        result.errors.slice(0, 10).forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
        if (result.errors.length > 10) {
          console.log(`   ... e altri ${result.errors.length - 10} errori`);
        }
      } else {
        console.log('\n✅ Nessun errore!');
      }
    } else {
      console.log(`❌ Errore: ${result.error}`);
      if (result.details) {
        console.log(`   Dettagli: ${result.details}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testImport();
