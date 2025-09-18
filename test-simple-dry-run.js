const mysql = require('mysql2/promise');

async function testSimpleDryRun() {
  console.log('🔄 Testing simplified DRY-RUN...');
  
  const poolGestione = mysql.createPool({
    host: 'bore.pub',
    port: 54000,
    user: 'root',
    password: '',
    database: 'gestionelogistica',
    connectionLimit: 10
  });
  
  const poolViaggi = mysql.createPool({
    host: 'bore.pub',
    port: 54000,
    user: 'root',
    password: '',
    database: 'viaggi_db',
    connectionLimit: 10
  });
  
  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if tables exist...');
    
    const [tabViaggi] = await poolGestione.execute("SHOW TABLES LIKE 'tab_viaggi'");
    console.log('✅ tab_viaggi table exists:', tabViaggi.length > 0);
    
    const [tabViaggiPod] = await poolViaggi.execute("SHOW TABLES LIKE 'viaggi_pod'");
    console.log('✅ viaggi_pod table exists:', tabViaggiPod.length > 0);
    
    // Test 2: Count records in source tables
    console.log('\n2. Counting records in source tables...');
    
    const [viaggiPodCount] = await poolViaggi.execute('SELECT COUNT(*) as count FROM viaggi_pod LIMIT 1');
    console.log('📊 viaggi_pod records:', viaggiPodCount[0].count);
    
    const [travelsCount] = await poolViaggi.execute('SELECT COUNT(*) as count FROM travels LIMIT 1');
    console.log('📊 travels records:', travelsCount[0].count);
    
    const [vettoriCount] = await poolGestione.execute("SELECT COUNT(*) as count FROM tab_vettori WHERE Tipo_Vettore <> 'Terzista' LIMIT 1");
    console.log('📊 tab_vettori (non-terzista) records:', vettoriCount[0].count);
    
    // Test 3: Get a small sample of data
    console.log('\n3. Getting sample data...');
    
    const [sampleViaggi] = await poolViaggi.execute('SELECT Viaggio, `Nome Trasportatore`, Data FROM viaggi_pod LIMIT 5');
    console.log('📋 Sample viaggi_pod records:');
    sampleViaggi.forEach((record, index) => {
      console.log(`   ${index + 1}. Viaggio: ${record.Viaggio}, Trasportatore: ${record['Nome Trasportatore']}, Data: ${record.Data}`);
    });
    
    // Test 4: Check existing records in destination table
    console.log('\n4. Checking existing records in tab_viaggi...');
    const [existingCount] = await poolGestione.execute('SELECT COUNT(*) as count FROM tab_viaggi LIMIT 1');
    console.log('📊 Existing tab_viaggi records:', existingCount[0].count);
    
    console.log('\n✅ Simplified DRY-RUN test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during simplified DRY-RUN test:', error.message);
  } finally {
    await poolGestione.end();
    await poolViaggi.end();
  }
}

testSimpleDryRun();