import fs from 'fs/promises';
import path from 'path';

export interface OCRResult {
    text: string;
    confidence: number;
}

/**
 * Extrai texto de um PDF
 */
export async function extractTextFromPDF(pdfPath: string): Promise<OCRResult> {
    try {
        const dataBuffer = await fs.readFile(pdfPath);

        // Usar require para importar pdf-parse (CommonJS)
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(dataBuffer);

        return {
            text: data.text || '',
            confidence: 95, // PDFs geralmente têm alta confiança
        };
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        throw new Error('Falha ao extrair texto do PDF');
    }
}

/**
 * Processa arquivo PDF e extrai texto
 */
export async function processReceipt(filePath: string): Promise<OCRResult> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
        return await extractTextFromPDF(filePath);
    } else {
        throw new Error('Apenas arquivos PDF são suportados');
    }
}
