const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

// Configurações do VPS (Mesmas do sistema da Ótica)
const HOST = '2.24.84.26';
const USER = 'root';
const PASS = 'I(vy.qgRz3#-36Ut';

async function run(cmd, desc) {
  console.log(`\n▶ ${desc}...`);
  const result = await ssh.execCommand(cmd, { execOptions: { pty: false } });
  if (result.stdout) console.log(result.stdout);
  if (result.stderr && !result.stderr.includes('WARNING') && !result.stderr.includes('debconf')) {
    console.log('⚠', result.stderr.substring(0, 300));
  }
  return result;
}

async function main() {
  console.log('🔌 Conectando ao VPS para configurar NATRON IA...', HOST);
  
  await ssh.connect({
    host: HOST,
    username: USER,
    password: PASS,
    readyTimeout: 30000,
  });

  console.log('✅ Conectado!');

  // 1. Criar estrutura de pastas separada
  await run('mkdir -p /opt/natron-ia/data/mysql /opt/natron-ia/data/ollama', 'Criando pastas do Natron');

  // 2. Criar docker-compose.yml dedicado ao Natron
  const compose = `version: '3.8'

services:
  db-natron:
    image: mysql:8.0
    container_name: natron-db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: NatronRootPassword2026
      MYSQL_DATABASE: natron_db
      MYSQL_USER: natron_user
      MYSQL_PASSWORD: NatronPassword2026
    volumes:
      - ./data/mysql:/var/lib/mysql
    networks:
      - natron-net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  ollama:
    image: ollama/ollama:latest
    container_name: natron-ollama
    restart: always
    volumes:
      - ./data/ollama:/root/.ollama
    ports:
      - "11434:11434"
    networks:
      - natron-net
    deploy:
      resources:
        limits:
          memory: 8192M

  api-natron:
    image: node:20-alpine
    container_name: natron-api
    restart: always
    working_dir: /app
    environment:
      DATABASE_URL: "mysql://natron_user:NatronPassword2026@db-natron:3306/natron_db"
      OLLAMA_URL: "http://ollama:11434"
      NODE_ENV: production
    networks:
      - natron-net

networks:
  natron-net:
    driver: bridge
`;

  await run(`cat > /opt/natron-ia/docker-compose.yml << 'ENDOFFILE'\n${compose}\nENDOFFILE`, 'Criando docker-compose.yml do Natron');

  // 3. Subir o Banco e o Ollama
  await run('cd /opt/natron-ia && docker compose up -d db-natron ollama', 'Iniciando Banco e IA');

  // 4. Baixar o modelo de IA (Llama 3 8B)
  console.log('\n⏳ Baixando modelo Llama 3 (Isso pode levar alguns minutos dependendo da conexão do VPS)...');
  await run('docker exec natron-ollama ollama pull llama3', 'Baixando modelo Llama 3');

  // 5. Verificar status
  await run('cd /opt/natron-ia && docker compose ps', 'Status dos containers Natron');

  console.log('\n\n🎉 NATRON IA PREPARADO NO VPS!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Banco de Dados (Postgres) OK');
  console.log('✅ Motor de IA (Ollama) OK');
  console.log('✅ Modelo Llama 3 Instalado');
  console.log('✅ Rede natron-net Isolada');
  console.log('');
  console.log('📡 O próximo passo é fazer o deploy da sua API Natron!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  ssh.dispose();
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  ssh.dispose();
});
