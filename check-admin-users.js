const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'bore.pub',
      port: 54000,
      user: 'root',
      password: '',
      database: 'gestionelogistica'
    });
    
    const [rows] = await conn.execute(
      'SELECT username, password_hash FROM users WHERE username IN (?, ?)',
      ['admin', 'cody']
    );
    
    console.log('Utenti admin trovati:');
    rows.forEach(user => {
      console.log(`- ${user.username}: ${user.password_hash ? 'Hash presente' : 'Nessun hash'}`);
    });
    
    await conn.end();
  } catch (error) {
    console.error('Errore:', error.message);
  }
})();