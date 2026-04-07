// ============================================
// Natron IA — Entry Point (Ultra Stable)
// ============================================
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

try {
    console.log('🚀 Natron IA - Booting Server...');

    // 1) Inicia o servidor principal
    require('./backend/dist/server.js');

    // 2) Executa a manutenção do banco em um processo SEPARADO 
    // Isso evita o Prisma PANIC no processo principal do servidor.
    setTimeout(() => {
        console.log('📦 Starting background DB maintenance task...');
        const child = spawn('node', [path.join(__dirname, 'db-init.js')], {
            detached: true,
            stdio: 'ignore',
            env: process.env
        });
        child.unref();
    }, 10000); // 10 segundos de delay real

} catch (error) {
    console.error('🚨 SERVIDOR NÃO PÔDE LIGAR:', error.message);
}
