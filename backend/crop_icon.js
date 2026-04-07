const Jimp = require('jimp');

async function main() {
    const inputPath = '../android-chrome-512x512.png';
    const outputPath = '../frontend/public/favicon.png'; 
    const logoDestPath = '../frontend/public/logo.png'; 

    console.log('Lendo imagem...');
    const image = await Jimp.read(inputPath);
    
    console.log('Realizando o auto-crop (corte da parte transparente)...');
    image.autocrop(); 
    
    console.log('Salvando na pasta public...');
    await image.writeAsync(outputPath);
    await image.writeAsync(logoDestPath);
    console.log('Pronto! Imagem salva.');
}

main().catch(console.error);
