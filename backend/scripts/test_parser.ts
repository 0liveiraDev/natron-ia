import { parseReceiptText } from '../src/services/receiptParser';

// Texto simulado do comprovante Mercado Pago/Airbnb
const sampleText = `
Comprovante de Pagamento
Segunda-feira, 29 de dezembro de 2025, às 10:44:50.

Sua compra
Total: R$ 98,67

De
Bruno Jose Lopes da Silva Oliveira
CPF: ***.391.484-**
PSP: 323 - Mercado Pago

Para
AIRBNB PLATAFORMA DIGITAL LTDA
CNPJ: 36.297.602/0001-08
PSP: ADYEN DO BRASIL INSTITUICAO DE PAGAMENTO LTDA.

Identificador da transação
00000AFT3EZG39CWQ6L2GBDSQ9
`;

console.log('🧪 Testando parser com comprovante Airbnb/Mercado Pago...\n');
console.log('📄 Texto do comprovante:');
console.log(sampleText);
console.log('\n' + '='.repeat(60) + '\n');

const result = parseReceiptText(sampleText);

console.log('📊 Resultado do Parser:');
console.log('  💰 Valor:', result.amount);
console.log('  📅 Data:', result.date);
console.log('  🏪 Estabelecimento:', result.establishment);
console.log('  📂 Categoria:', result.category);
console.log('  🔖 Subcategoria:', result.subcategory);
console.log('  📊 Tipo:', result.categoryType);

console.log('\n' + '='.repeat(60));
console.log('\n✅ Esperado:');
console.log('  🏪 Estabelecimento: Airbnb');
console.log('  📂 Categoria: lazer');
console.log('  🔖 Subcategoria: hospedagem');

if (result.establishment === 'Airbnb' && result.category === 'lazer') {
    console.log('\n✅ SUCESSO! Parser funcionando corretamente! 🎉');
} else {
    console.log('\n❌ FALHA! Parser não detectou Airbnb corretamente.');
}
