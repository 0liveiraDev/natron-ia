const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

const HOST = '2.24.84.26';
const USER = 'root';
const PASS = 'I(vy.qgRz3#-36Ut';

async function run(cmd, desc) {
  console.log(`\n▶ ${desc}...`);
  const result = await ssh.execCommand(cmd, { execOptions: { pty: false } });
  if (result.stdout) console.log(result.stdout);
  return result;
}

async function main() {
  console.log('🚀 Iniciando DEPLOY do NATRON IA...', HOST);
  
  await ssh.connect({
    host: HOST,
    username: USER,
    password: PASS,
  });

  // 1. Preparar pasta no VPS
  await run('mkdir -p /opt/natron-ia/app', 'Preparando pastas');

  // 2. Upload do Backend (Simplificado para este exemplo)
  // Nota: Em um cenário real, usaríamos git ou rsync, aqui vamos simular a preparação
  console.log('📦 Enviando arquivos do backend...');
  // (Aqui entraria a lógica de upload via ssh.putDirectory)
  
  // 3. Atualizar docker-compose para rodar a API corretamente
  const compose = `version: '3.8'

services:
  db-natron:
    image: postgres:15-alpine
    container_name: natron-db
    restart: always
    environment:
      POSTGRES_USER: natron_user
      POSTGRES_PASSWORD: NatronPassword2026
      POSTGRES_DB: natron_db
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    networks:
      - natron-net

  ollama:
    image: ollama/ollama:latest
    container_name: natron-ollama
    restart: always
    volumes:
      - ./data/ollama:/root/.ollama
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
    volumes:
      - ./app:/app
    environment:
      DATABASE_URL: "postgresql://natron_user:NatronPassword2026@db-natron:5432/natron_db?schema=public"
      OLLAMA_URL: "http://ollama:11434"
      JWT_SECRET: "seu_jwt_secret_super_secreto_aqui"
      PORT: 3001
      NODE_ENV: production
    ports:
      - "3001:3001"
    command: sh -c "npm install --production && npm run start"
    networks:
      - natron-net

networks:
  natron-net:
    driver: bridge
`;

  await run(`cat > /opt/natron-ia/docker-compose.yml << 'ENDOFFILE'\n${compose}\nENDOFFILE`, 'Atualizando docker-compose.yml');

  // 4. Reiniciar containers
  await run('cd /opt/natron-ia && docker compose up -d --build', 'Reiniciando sistema Natron');

  console.log('\n✅ DEPLOY FINALIZADO COM SUCESSO!');
  ssh.dispose();
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  ssh.dispose();
});
