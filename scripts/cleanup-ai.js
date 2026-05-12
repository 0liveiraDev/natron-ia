const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function cleanup() {
  try {
    await ssh.connect({
      host: '2.24.84.26',
      username: 'root',
      password: 'I(vy.qgRz3#-36Ut'
    });

    console.log('--- REMOVENDO MODELO ANTIGO (LLAMA3) ---');
    const rm = await ssh.execCommand('docker exec natron-ollama ollama rm llama3');
    console.log(rm.stdout || 'Modelo removido ou não encontrado.');

    console.log('\n--- GARANTINDO MODELO NOVO (LLAMA3.2) ---');
    const pull = await ssh.execCommand('docker exec natron-ollama ollama pull llama3.2');
    console.log(pull.stdout);

    console.log('\n--- STATUS FINAL ---');
    const list = await ssh.execCommand('docker exec natron-ollama ollama list');
    console.log(list.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Erro:', err.message);
    ssh.dispose();
  }
}

cleanup();
