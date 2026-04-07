const sharp = require('sharp');

async function main() {
    const inputPath = '../android-chrome-512x512.png';
    const outputPath = '../frontend/public/favicon.png';
    const logoDestPath = '../frontend/public/logo.png';
    
    console.log('Lendo, removendo zonas transparentes via sharp() e salvando imagem...');
    
    // trim() removes background colors (by default top-left pixel color)
    await sharp(inputPath)
        .trim()
        .toFile(outputPath);
        
    await sharp(inputPath)
        .trim()
        .toFile(logoDestPath);
        
    console.log('Finalizado com sucesso.');
}

main().catch(console.error);
