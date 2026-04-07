// ============================================
// Natron IA — Entry Point (Hostinger Ultra-Light)
// ============================================
require('dotenv').config();

try {
    console.log('🚀 Natron IA - Booting Server...');

    // Inicia o servidor principal diretamente. 
    // No ambiente LiteSpeed/Passenger da Hostinger, menos é mais.
    require('./backend/dist/server.js');

} catch (error) {
    console.error('🚨 FATAL BOOT ERROR:', error.message);
}
