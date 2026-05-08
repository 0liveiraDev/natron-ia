"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPDF = extractTextFromPDF;
exports.processReceipt = processReceipt;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Extrai texto de um PDF
 */
async function extractTextFromPDF(pdfPath) {
    try {
        const dataBuffer = await promises_1.default.readFile(pdfPath);
        // Usar require para importar pdf-parse (CommonJS)
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(dataBuffer);
        return {
            text: data.text || '',
            confidence: 95, // PDFs geralmente têm alta confiança
        };
    }
    catch (error) {
        console.error('Erro ao processar PDF:', error);
        throw new Error('Falha ao extrair texto do PDF');
    }
}
/**
 * Processa arquivo PDF e extrai texto
 */
async function processReceipt(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        return await extractTextFromPDF(filePath);
    }
    else {
        throw new Error('Apenas arquivos PDF são suportados');
    }
}
