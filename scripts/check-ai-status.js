const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: '2.24.84.26',
      username: 'root',
      password: 'I(vy.qgRz3#-36Ut'
    });

    console.log('--- STATUS DOS CONTAINERS ---');
    const ps = await ssh.execCommand('docker ps --filter name=natron');
    console.log(ps.stdout);

    console.log('\n--- VERIFICANDO MODELO LLAMA3 ---');
    const model = await ssh.execCommand('docker exec natron-ollama ollama list');
    console.log(model.stdout);

    console.log('\n--- TESTE DE RESPOSTA DA IA ---');
    const ai = await ssh.execCommand('docker exec natron-ollama ollama run llama3 "Oi, quem é você?"');
    console.log(ai.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Erro:', err.message);
    ssh.dispose();
  }
}

check();
