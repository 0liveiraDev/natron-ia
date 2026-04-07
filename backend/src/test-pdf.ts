import path from 'path';
import fs from 'fs/promises';

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

        const pdfParseModule: any = await import('pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;

        console.log('🔍 Parsing PDF...');
        const data: any = await pdfParse(dataBuffer);

        console.log('✅ PDF parsed successfully!');
        console.log('📝 Text length:', data.text.length);
        console.log('📄 First 500 chars:', data.text.substring(0, 500));

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPdfParse();
