// ============================================
// Natron IA — Entry Point (Padrão Hostinger)
// ============================================
require('dotenv').config();

try {
    if (!process.env.DATABASE_URL && process.env.DB_HOST) {
        const user = encodeURIComponent(process.env.DB_USER || '');
        const pass = encodeURIComponent(process.env.DB_PASS || '');
        const host = process.env.DB_HOST || '127.0.0.1';
        const port = process.env.DB_PORT || '3306';
        const name = process.env.DB_NAME || 'natron';
        process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;

        console.log('🔄 Sincronizando banco de dados com a Hostinger...');
        try {
            const { execSync } = require('child_process');
            execSync('npx prisma db push --accept-data-loss', { 
                cwd: __dirname + '/backend', 
                env: process.env, 
                stdio: 'inherit' 
            });
            console.log('✅ Banco sincronizado! Criando usuário admin se não existir...');
            execSync('npx tsx prisma/seed.ts', { 
                cwd: __dirname + '/backend', 
                env: process.env, 
                stdio: 'inherit' 
            });
            console.log('✅ Seeds rodados com sucesso!');
        } catch (dbError) {
            console.error('⚠️ Falha ao sincronizar o BD (Mas a aplicação vai continuar tentanto):', dbError.message);
            if (dbError.stdout) console.error('Stdout:', dbError.stdout.toString());
            if (dbError.stderr) console.error('Stderr:', dbError.stderr.toString());
        }
    }

    console.log('🚀 Iniciando Natron IA...');
    require('./backend/dist/server.js');
} catch (error) {
    console.error('🚨 ERRO CRÍTICO NO STARTUP:');
    console.error(error);
    console.error(error.stack);
    
    // Mantém o processo vivo a cada 10s para conseguir ler o erro no painel
    setInterval(() => {
        console.error('🚨 Servidor travado no erro de boot acima.');
    }, 10000);
}
