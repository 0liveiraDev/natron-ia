const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

async function test() {
    try {
        console.log('Reading file...');
        const buffer = await fs.readFile('./test_receipts/Itau_Academia.pdf');
        console.log('Buffer size:', buffer.length);
        
        console.log('Parsing...');
        const data = await pdfParse(buffer);
        console.log('TEXT:');
        console.log(data.text);
    } catch (e) {
        console.error('ERROR OCCURRED:');
        console.error(e);
    }
}

test();
