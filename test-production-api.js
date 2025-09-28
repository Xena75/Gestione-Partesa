const https = require('https');
const fs = require('fs');

// Test per l'API di produzione su Vercel
async function testProductionAPI() {
  console.log('🔍 Testing production API...');
  
  try {
    // Prima facciamo login per ottenere il token
    const loginData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });
    
    const loginOptions = {
      hostname: 'gestione-partesa.vercel.app',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    console.log('📝 Attempting login...');
    
    const loginResponse = await new Promise((resolve, reject) => {
      const req = https.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data, headers: res.headers });
        });
      });
      
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });
    
    console.log('Login response status:', loginResponse.statusCode);
    console.log('Login response:', loginResponse.data);
    console.log('Login headers:', loginResponse.headers);
    
    if (loginResponse.statusCode !== 200) {
      console.error('❌ Login failed');
      return;
    }
    
    // Estrai il token dal cookie Set-Cookie
    const setCookieHeader = loginResponse.headers['set-cookie'];
    let token = null;
    
    if (setCookieHeader) {
      for (const cookie of setCookieHeader) {
        if (cookie.startsWith('auth-token=')) {
          token = cookie.split('auth-token=')[1].split(';')[0];
          break;
        }
      }
    }
    
    if (!token) {
      console.error('❌ No auth-token cookie received');
      console.error('Set-Cookie headers:', setCookieHeader);
      return;
    }
    
    console.log('✅ Login successful, token received from cookie');
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Ora testiamo l'API dei documenti
    console.log('📄 Testing document upload API...');
    
    // Creiamo un file di test
    const testFileContent = Buffer.from('Test PDF content for production API test');
    
    // Creiamo FormData manualmente
    const boundary = '----formdata-boundary-' + Math.random().toString(36);
    let formData = '';
    
    // Aggiungi document_type
    formData += `--${boundary}\r\n`;
    formData += 'Content-Disposition: form-data; name="document_type"\r\n\r\n';
    formData += 'altro\r\n';
    
    // Aggiungi notes
    formData += `--${boundary}\r\n`;
    formData += 'Content-Disposition: form-data; name="notes"\r\n\r\n';
    formData += 'Test upload from production API test\r\n';
    
    // Aggiungi file
    formData += `--${boundary}\r\n`;
    formData += 'Content-Disposition: form-data; name="file"; filename="test.pdf"\r\n';
    formData += 'Content-Type: application/pdf\r\n\r\n';
    
    const formDataBuffer = Buffer.concat([
      Buffer.from(formData, 'utf8'),
      testFileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);
    
    const uploadOptions = {
      hostname: 'gestione-partesa.vercel.app',
      port: 443,
      path: '/api/vehicles/EZ184PF/documents',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBuffer.length,
        'Cookie': `auth-token=${token}`
      }
    };
    
    const uploadResponse = await new Promise((resolve, reject) => {
      const req = https.request(uploadOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data, headers: res.headers });
        });
      });
      
      req.on('error', reject);
      req.write(formDataBuffer);
      req.end();
    });
    
    console.log('Upload response status:', uploadResponse.statusCode);
    console.log('Upload response:', uploadResponse.data);
    
    if (uploadResponse.statusCode === 500) {
      console.error('❌ 500 Error detected in production!');
      console.error('Response body:', uploadResponse.data);
    } else {
      console.log('✅ API call completed');
    }
    
  } catch (error) {
    console.error('❌ Error testing production API:', error);
  }
}

testProductionAPI();