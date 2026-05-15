const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH :: Conectado com sucesso!');
  
  // Encontrar o diretório do projeto e fazer deploy
  const cmd = `
    echo "Buscando processos Node..."
    ps aux | grep -i node
    echo "Procurando pm2..."
    ls -la /root/.pm2 || echo "Sem /root/.pm2"
    echo "Fim."
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('SSH :: Sessão encerrada. Código:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '2.24.84.26',
  port: 22,
  username: 'root',
  password: 'E+y(v9#9mjZ.n9bW'
});
