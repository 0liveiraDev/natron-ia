const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function testPdf() {
    try {
        const files = fs.readdirSync('uploads/receipts');
        if (files.length === 0) { console.log('No PDFs found'); return; }
        const latestPdf = files[files.length - 1];
        console.log('Testing with', latestPdf);
        const dataBuffer = fs.readFileSync(path.join('uploads/receipts', latestPdf));
        const data = await pdf(dataBuffer);
        console.log('Extracted text length:', data.text.length);
        console.log('Text preview:', data.text.substring(0, 200));
    } catch (e) {
        console.error('Error:', e.message);
    }
}
testPdf();
