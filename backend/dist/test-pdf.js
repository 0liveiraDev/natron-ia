"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function testPdfParse() {
    try {
        console.log('🧪 Testing pdf-parse...');
        // Pegar o PDF mais recente
        const pdfPath = path_1.default.join(__dirname, '../uploads/receipts/receipt-1769995174493-89487275.pdf');
        console.log('📁 Reading file:', pdfPath);
        const exists = await promises_1.default.access(pdfPath).then(() => true).catch(() => false);
        if (!exists) {
            console.log('❌ File does not exist');
            return;
        }
        console.log('✅ File exists');
        const dataBuffer = await promises_1.default.readFile(pdfPath);
        console.log('📊 File size:', dataBuffer.length, 'bytes');
        const pdfParseModule = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
        const pdfParse = pdfParseModule.default || pdfParseModule;
        console.log('🔍 Parsing PDF...');
        const data = await pdfParse(dataBuffer);
        console.log('✅ PDF parsed successfully!');
        console.log('📝 Text length:', data.text.length);
        console.log('📄 First 500 chars:', data.text.substring(0, 500));
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
}
testPdfParse();
