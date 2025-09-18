const http = require('http');

function testDryRun() {
  console.log('🔄 Testing DRY-RUN mode...');
  
  const postData = '';
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/viaggi/sync-tab-viaggi?dry_run=true',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ Response received:');
        console.log(JSON.stringify(jsonData, null, 2));
      } catch (error) {
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testDryRun();