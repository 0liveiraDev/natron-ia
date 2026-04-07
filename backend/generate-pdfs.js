const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

const outputDir = path.join(__dirname, 'test_receipts');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

function createPdf(filename, contentLines) {
    return new Promise((resolve) => {
        const doc = new PDFDocument();
        const filepath = path.join(outputDir, filename);
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Styling the PDF to resemble a basic receipt
        doc.font('Courier');
        doc.fontSize(12);

        for (const line of contentLines) {
            if (line === '---') {
                doc.moveDown();
                doc.text('----------------------------------------', { align: 'center' });
                doc.moveDown();
            } else if (line.startsWith('TITLE:')) {
                doc.fontSize(16).text(line.replace('TITLE:', '').trim(), { align: 'center', underline: true });
                doc.fontSize(12).moveDown();
            } else {
                doc.text(line);
            }
        }

        doc.end();
        stream.on('finish', () => resolve(filepath));
    });
}

async function generateAll() {
    console.log('Generating sample PDFs...');

    // 1. Mercado
    await createPdf('Supermercado_Assai.pdf', [
        'TITLE: ASSAÍ ATACADISTA',
        'CNPJ: 06.057.223/0001-71',
        'Av. das Nações Unidas, 123',
        'São Paulo - SP',
        '---',
        'Cupom Fiscal Eletrônico',
        'Data: 07/04/2026',
        '---',
        'PRODUTOS:',
        '1x ARROZ 5KG - R$ 25,90',
        '2x FEIJAO 1KG - R$ 14,00',
        '1x FRANGO 1KG - R$ 18,50',
        '---',
        'TOTAL A PAGAR: R$ 58,40',
        'Forma de Pagamento: Cartão de Crédito',
        'VOLTE SEMPRE!'
    ]);

    // 2. Nubank Pix
    await createPdf('Pix_Nubank.pdf', [
        'TITLE: COMPROVANTE DE TRANSFERÊNCIA',
        'NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO',
        '---',
        'Você transferiu pelo Pix:',
        'Valor: R$ 150,00',
        'Data da transferência: 07/04/2026',
        '---',
        'DESTINO:',
        'Pago para: JORGE SILVA PEREIRA',
        'CPF: ***.123.456-**',
        'Instituição: BANCO DO BRASIL S.A.',
        '---',
        'ID da transação: E00000000202604071234'
    ]);

    // 3. Itaú Pagamento Academia
    await createPdf('Itau_Academia.pdf', [
        'TITLE: BANCO ITAÚ UNIBANCO S.A.',
        'COMPROVANTE DE PAGAMENTO / TRANSFERÊNCIA',
        '---',
        'Dados da conta debitada:',
        'Agência: 1234 Conta: 56789-0',
        '---',
        'Dados do Pagamento:',
        'Favorecido: SMART FIT ACADEMIA',
        'CNPJ: 10.123.456/0001-99',
        '---',
        'Valor do pagamento: R$ 119,90',
        'Data: 01/04/2026',
        '---',
        'Autenticação Bancária: 1AB.2CD.3EF.4GH'
    ]);

    console.log('Done! Look in the backend/test_receipts folder.');
}

generateAll();
