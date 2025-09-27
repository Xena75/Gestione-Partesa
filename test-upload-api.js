const fs = require('fs');
const path = require('path');

// Test per verificare l'upload di documenti usando cookie (come fa il browser)
async function testDocumentUpload() {
  try {
    console.log('🧪 Inizio test upload documento...');
    
    // 1. Login per ottenere il token
    console.log('📝 Effettuo login...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login fallito: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login effettuato con successo');
    
    // 2. Prepara il file di test
    const testFilePath = path.join(__dirname, 'test-upload-simple.txt');
    const fileBuffer = fs.readFileSync(testFilePath);
    
    // 3. Crea FormData per l'upload
    const formData = new FormData();
    const file = new File([fileBuffer], 'test-document.txt', { type: 'text/plain' });
    formData.append('file', file);
    formData.append('document_type', 'altro');
    formData.append('expiry_date', '2025-12-31');
    formData.append('notes', 'Documento di test');
    
    // 4. Effettua l'upload usando il cookie (come fa il browser)
    console.log('📤 Effettuo upload documento...');
    const uploadResponse = await fetch('http://localhost:3001/api/vehicles/EZ184PF/documents', {
      method: 'POST',
      headers: {
        'Cookie': `auth-token=${token}`,
      },
      body: formData
    });
    
    const uploadResult = await uploadResponse.json();
    
    console.log('📊 Status upload:', uploadResponse.status);
    console.log('📄 Risposta upload:', uploadResult);
    
    if (uploadResponse.ok) {
      console.log('✅ Upload completato con successo!');
      console.log('📄 Dettagli documento:', uploadResult.document);
      return uploadResult;
    } else {
      console.error('❌ Errore durante upload:', uploadResult);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Errore nel test:', error.message);
    return null;
  }
}

// Esegui il test
testDocumentUpload().then(result => {
  if (result) {
    console.log('🎉 Test completato con successo!');
  } else {
    console.log('💥 Test fallito!');
  }
  process.exit(result ? 0 : 1);
});