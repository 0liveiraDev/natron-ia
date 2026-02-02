const path = require('path');
const fs = require('fs').promises;

async function testPdfParse() {
    try {
        console.log('🧪 Testing pdf-parse...');

        // Pegar o PDF mais recente
        const pdfPath = path.join(__dirname, '../uploads/receipts/receipt-1769995174493-89487275.pdf');

        console.log('📁 Reading file:', pdfPath);
        const exists = await fs.access(pdfPath).then(() => true).catch(() => false);

        if (!exists) {
            console.log('❌ File does not exist');
            return;
        }

        console.log('✅ File exists');

        const dataBuffer = await fs.readFile(pdfPath);
        console.log('📊 File size:', dataBuffer.length, 'bytes');

        const pdfParse = require('pdf-parse');

        console.log('🔍 Parsing PDF...');
        const data = await pdfParse(dataBuffer);

        console.log('✅ PDF parsed successfully!');
        console.log('📝 Text length:', data.text.length);
        console.log('📄 First 500 chars:', data.text.substring(0, 500));

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPdfParse();
