// Application Entry Point - Hostinger Node.js
// Este arquivo serve para espelhar o padrão de configuração do UpCRIATIVE.
// Ele delega a execução direto para a versão compilada do backend,
// permitindo que você preencha "app.js" e "./" na Hostinger com sucesso.

console.log('Iniciando servidor Node.js a partir da raiz (app.js)...');
require('./backend/dist/server.js');
