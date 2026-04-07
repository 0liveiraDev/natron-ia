// ============================================
// Natron IA — Entry Point (Padrão Hostinger)
// ============================================
// Este arquivo é chamado automaticamente pela Hostinger.
// Ele monta a DATABASE_URL a partir das variáveis individuais
// e delega a execução para o backend compilado (Express).

require('dotenv').config();

// Monta a DATABASE_URL automaticamente a partir das variáveis separadas
// para evitar problemas com caracteres especiais na senha
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const user = encodeURIComponent(process.env.DB_USER || '');
    const pass = encodeURIComponent(process.env.DB_PASS || '');
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || '3306';
    const name = process.env.DB_NAME || 'natron';
    process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;
}

console.log('🚀 Iniciando Natron IA...');
require('./backend/dist/server.js');
