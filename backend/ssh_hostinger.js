const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "Reiniciando servidor..."
    pkill -f lsnode || echo "Sem processo lsnode"
    pkill -f node || echo "Sem processo node"
    echo "Feito!"
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
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
  host: '185.173.111.203',
  port: 65002,
  username: 'u710961292',
  password: 'DQ8#AtsuH7HfiVg'
});
