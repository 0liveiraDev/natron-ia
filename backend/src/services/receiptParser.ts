export interface ParsedReceipt {
    amount?: number;
    date?: Date;
    establishment?: string;
    category?: string;
    subcategory?: string;
    categoryType?: 'essencial' | 'variavel';
    description?: string;
}

/**
 * Normaliza o texto removendo acentos e espaços extras para melhorar o regex
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/\s+/g, ' ') // normaliza espaços
        .trim();
}

/**
 * Extrai valor monetário do texto
 */
function extractAmount(text: string): number | undefined {
    const textNorm = normalizeText(text);

    // Primeiro tentar encontrar perto de palavras-chave "total" ou "valor pago"
    const keywordRegexes = [
        /(?:total|valor pago|valor cobrado|total a pagar|total da nota|valor total|pagamento|debito|credito|valor|valor da transferencia|valor do pix|valor do pagamento)[\s:]*r?\$?\s*(\d+[.,]\d{2})/i,
        /r\$\s*(\d+[.,]\d{2})(?=\s*(?:total|pago|valor|transferido))/i
    ];

    for (const regex of keywordRegexes) {
        const match = textNorm.match(regex);
        if (match) {
            const val = parseFloat(match[1].replace(',', '.'));
            if (val > 0 && val < 100000) return val;
        }
    }

    // Fallback: buscar o maior valor sensato com 2 casas decimais do texto todo
    const allMatches = Array.from(textNorm.matchAll(/(?:r\$?|R\$?)?\s*(\d{1,4}[.,]\d{2})\b/g));
    const values = allMatches
        .map(m => parseFloat(m[1].replace(',', '.')))
        .filter(v => v > 0 && v < 100000);

    if (values.length > 0) {
        // Assume que o maior valor na nota geralmente é o total
        return Math.max(...values);
    }

    return undefined;
}

/**
 * Extrai data do texto
 */
function extractDate(text: string): Date | undefined {
    const textNorm = normalizeText(text);

    const monthMap: Record<string, number> = {
        'janeiro': 0, 'jan': 0,
        'fevereiro': 1, 'fev': 1,
        'marco': 2, 'mar': 2,
        'abril': 3, 'abr': 3,
        'maio': 4, 'mai': 4,
        'junho': 5, 'jun': 5,
        'julho': 6, 'jul': 6,
        'agosto': 7, 'ago': 7,
        'setembro': 8, 'set': 8,
        'outubro': 9, 'out': 9,
        'novembro': 10, 'nov': 10,
        'dezembro': 11, 'dez': 11
    };

    const patterns = [
        // "15 de janeiro de 2025"
        {
            regex: /(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i,
            extract: (match: RegExpMatchArray) => {
                const day = parseInt(match[1]);
                const month = monthMap[match[2]];
                const year = parseInt(match[3]);
                if (month !== undefined) return new Date(year, month, day);
                return undefined;
            }
        },
        // ISO format: "2025-12-29" or "2025/12/29"
        {
            regex: /(\d{4})[-\/](\d{2})[-\/](\d{2})/,
            extract: (match: RegExpMatchArray) => {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const day = parseInt(match[3]);
                return new Date(year, month, day);
            }
        },
        // DD/MM/YYYY
        {
            regex: /(\d{2})\/(\d{2})\/(\d{4})/,
            extract: (match: RegExpMatchArray) => {
                const day = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const year = parseInt(match[3]);
                return new Date(year, month, day);
            }
        },
        // DD/MM/YY
        {
            regex: /(\d{2})\/(\d{2})\/(\d{2})/,
            extract: (match: RegExpMatchArray) => {
                const day = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const year = 2000 + parseInt(match[3]);
                return new Date(year, month, day);
            }
        }
    ];

    for (const pattern of patterns) {
        const match = textNorm.match(pattern.regex);
        if (match) {
            const date = pattern.extract(match);
            if (date && !isNaN(date.getTime())) {
                return date;
            }
        }
    }

    return undefined;
}

/**
 * Extrai o nome do recebedor do Pix ou Transferência Bancária
 */
function extractReceiver(text: string): string | undefined {
    const textNorm = normalizeText(text);

    const regexes = [
        /(?:recebedor|favorecido|destinatario|pago para|nome do recebedor|nome)[\s:]+([a-z ]{5,40})(?:cpf|cnpj|instituicao|agencia|conta|chave|data|banco)/i,
        /(?:recebedor|favorecido|destinatario|pago para|nome do recebedor|nome)[\s:]+([a-z ]{5,40})/i,
        /para[\s:]+([a-z ]{5,40})/i
    ];

    for (const regex of regexes) {
        const match = textNorm.match(regex);
        if (match && match[1]) {
            let name = match[1].trim();
            
            // Define a hard stop se a string de nome contiver palavras-chave irrelevantes arrastadas
            const stopWords = [' cpf', ' cnpj', ' data', ' valor', ' banco', ' instituicao', ' chave'];
            for (const sw of stopWords) {
                const swPos = name.indexOf(sw);
                if (swPos > 0) {
                    name = name.substring(0, swPos).trim();
                }
            }

            if (name.length > 3) {
                // Return original capitalized format if possible by simple split map
                return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }
    }
    return undefined;
}

/**
 * Identifica estabelecimento, categoria e subcategoria expandido
 */
function identifyEstablishmentAndCategory(text: string): {
    establishment?: string;
    category?: string;
    subcategory?: string;
    categoryType?: 'essencial' | 'variavel'
} {
    const textNorm = normalizeText(text);

    const establishments: Record<string, any> = {
        // ============= ALIMENTAÇÃO - MERCADO (Essencial) =============
        'carrefour': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Carrefour' },
        'assai': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Assaí' },
        'atacadao': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Atacadão' },
        'pao de acucar': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Pão de Açúcar' },
        'extra': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Extra' },
        'supermercado': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Supermercado' },
        'mercado': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Mercado' },
        'hortifruti': { type: 'essencial', category: 'alimentacao', subcategory: 'feira', name: 'Hortifruti' },
        'acougue': { type: 'essencial', category: 'alimentacao', subcategory: 'mercado', name: 'Açougue' },
        'padaria': { type: 'essencial', category: 'alimentacao', subcategory: 'padaria', name: 'Padaria' },
        'quitanda': { type: 'essencial', category: 'alimentacao', subcategory: 'feira', name: 'Quitanda' },
        
        // ============= ALIMENTAÇÃO - RESTAURANTES/DELIVERY (Variável) =============
        'ifood': { type: 'variavel', category: 'alimentacao', subcategory: 'delivery_ifood', name: 'iFood' },
        'rappi': { type: 'variavel', category: 'alimentacao', subcategory: 'delivery_rappi', name: 'Rappi' },
        'ze delivery': { type: 'variavel', category: 'alimentacao', subcategory: 'delivery', name: 'Zé Delivery' },
        'mcdonalds': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'McDonalds' },
        'burger king': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Burger King' },
        'subway': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Subway' },
        'bobs': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Bobs' },
        'habibs': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Habibs' },
        'outback': { type: 'variavel', category: 'alimentacao', subcategory: 'restaurante', name: 'Outback' },
        'coco bambu': { type: 'variavel', category: 'alimentacao', subcategory: 'restaurante', name: 'Coco Bambu' },
        'cacau show': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Cacau Show' },
        'kopenhagen': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Kopenhagen' },
        'restaurante': { type: 'variavel', category: 'alimentacao', subcategory: 'restaurante', name: 'Restaurante' },
        'pizzaria': { type: 'variavel', category: 'alimentacao', subcategory: 'restaurante', name: 'Pizzaria' },
        'lanchonete': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Lanchonete' },
        'bar ': { type: 'variavel', category: 'alimentacao', subcategory: 'bar', name: 'Bar' },
        'sorveteria': { type: 'variavel', category: 'alimentacao', subcategory: 'lanchonete', name: 'Sorveteria' },

        // ============= TRANSPORTE (Variável/Essencial) =============
        'uber': { type: 'variavel', category: 'transporte', subcategory: 'uber', name: 'Uber' },
        '99': { type: 'variavel', category: 'transporte', subcategory: '99', name: '99' },
        '99app': { type: 'variavel', category: 'transporte', subcategory: '99', name: '99' },
        'indrive': { type: 'variavel', category: 'transporte', subcategory: 'taxi', name: 'InDrive' },
        'taxi': { type: 'variavel', category: 'transporte', subcategory: 'taxi', name: 'Taxi' },
        'passagem': { type: 'variavel', category: 'transporte', subcategory: 'transporte_publico', name: 'Passagem' },
        'onibus': { type: 'variavel', category: 'transporte', subcategory: 'transporte_publico', name: 'Ônibus' },
        'metro': { type: 'variavel', category: 'transporte', subcategory: 'transporte_publico', name: 'Metrô' },
        'cptm': { type: 'variavel', category: 'transporte', subcategory: 'transporte_publico', name: 'CPTM' },
        
        'posto': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Posto de Combustível' },
        'ipiranga': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Posto Ipiranga' },
        'shell': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Posto Shell' },
        'petrobras': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Posto Petrobras' },
        'combustivel': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Combustível' },
        'gasolina': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Gasolina' },
        'etanol': { type: 'essencial', category: 'transporte', subcategory: 'combustivel', name: 'Etanol' },
        'estacionamento': { type: 'variavel', category: 'transporte', subcategory: 'estacionamento', name: 'Estacionamento' },
        'pedagio': { type: 'variavel', category: 'transporte', subcategory: 'pedagio', name: 'Pedágio' },
        'sem parar': { type: 'variavel', category: 'transporte', subcategory: 'pedagio', name: 'Sem Parar' },
        'veloe': { type: 'variavel', category: 'transporte', subcategory: 'pedagio', name: 'Veloe' },

        // ============= ASSINATURAS (Variável) =============
        'netflix': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Netflix' },
        'spotify': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Spotify' },
        'amazon prime': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Amazon Prime' },
        'disney': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Disney+' },
        'hbo': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'HBO Max' },
        'max': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Max' },
        'youtube': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'YouTube Premium' },
        'apple': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Apple' },
        'google': { type: 'variavel', category: 'assinaturas', subcategory: 'streaming', name: 'Google' },
        'smart fit': { type: 'variavel', category: 'assinaturas', subcategory: 'academia', name: 'Smart Fit' },
        'academia': { type: 'variavel', category: 'assinaturas', subcategory: 'academia', name: 'Academia' },

        // ============= LAZER / ENTRETENIMENTO (Variável) =============
        'cinema': { type: 'variavel', category: 'lazer', subcategory: 'cinema', name: 'Cinema' },
        'cinemark': { type: 'variavel', category: 'lazer', subcategory: 'cinema', name: 'Cinemark' },
        'cinepolis': { type: 'variavel', category: 'lazer', subcategory: 'cinema', name: 'Cinépolis' },
        'teatro': { type: 'variavel', category: 'lazer', subcategory: 'teatro', name: 'Teatro' },
        'show': { type: 'variavel', category: 'lazer', subcategory: 'show', name: 'Show' },
        'sympla': { type: 'variavel', category: 'lazer', subcategory: 'ingresso', name: 'Sympla' },
        'eventim': { type: 'variavel', category: 'lazer', subcategory: 'ingresso', name: 'Eventim' },
        'ingresso': { type: 'variavel', category: 'lazer', subcategory: 'ingresso', name: 'Ingresso' },

        // ============= SAÚDE E BELEZA (Essencial/Variável) =============
        'drogasil': { type: 'essencial', category: 'saude', subcategory: 'farmacia', name: 'Drogasil' },
        'pague menos': { type: 'essencial', category: 'saude', subcategory: 'farmacia', name: 'Pague Menos' },
        'droga raia': { type: 'essencial', category: 'saude', subcategory: 'farmacia', name: 'Droga Raia' },
        'drogaria': { type: 'essencial', category: 'saude', subcategory: 'farmacia', name: 'Drogaria' },
        'farmacia': { type: 'essencial', category: 'saude', subcategory: 'farmacia', name: 'Farmácia' },
        'unimed': { type: 'essencial', category: 'saude', subcategory: 'plano', name: 'Unimed' },
        'amil': { type: 'essencial', category: 'saude', subcategory: 'plano', name: 'Amil' },
        'sulamerica': { type: 'essencial', category: 'saude', subcategory: 'plano', name: 'SulAmérica' },
        'hospital': { type: 'essencial', category: 'saude', subcategory: 'hospital', name: 'Hospital' },
        'clinica': { type: 'essencial', category: 'saude', subcategory: 'clinica', name: 'Clínica' },
        
        'barbearia': { type: 'variavel', category: 'servicos', subcategory: 'beleza', name: 'Barbearia' },
        'salao': { type: 'variavel', category: 'servicos', subcategory: 'beleza', name: 'Salão de Beleza' },
        'manicure': { type: 'variavel', category: 'servicos', subcategory: 'beleza', name: 'Manicure' },
        'estetica': { type: 'variavel', category: 'servicos', subcategory: 'beleza', name: 'Estética' },
        'cosmetico': { type: 'variavel', category: 'saude', subcategory: 'beleza', name: 'Cosméticos' },
        'boticario': { type: 'variavel', category: 'saude', subcategory: 'beleza', name: 'O Boticário' },
        'natura': { type: 'variavel', category: 'saude', subcategory: 'beleza', name: 'Natura' },

        // ============= COMPRAS / E-COMMERCE (Variável) =============
        'amazon': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Amazon' },
        'mercado livre': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Mercado Livre' },
        'shopee': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Shopee' },
        'aliexpress': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'AliExpress' },
        'shein': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Shein' },
        'kabum': { type: 'variavel', category: 'outros', subcategory: 'eletronicos', name: 'KaBuM!' },
        'pichau': { type: 'variavel', category: 'outros', subcategory: 'eletronicos', name: 'Pichau' },
        'terabyte': { type: 'variavel', category: 'outros', subcategory: 'eletronicos', name: 'Terabyte' },
        'magazine luiza': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Magazine Luiza' },
        'magalu': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Magazine Luiza' },
        'americanas': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Americanas' },
        'casas bahia': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Casas Bahia' },
        'netshoes': { type: 'variavel', category: 'outros', subcategory: 'compras_online', name: 'Netshoes' },
        'loja': { type: 'variavel', category: 'outros', subcategory: 'compras', name: 'Loja' },
        'shopping': { type: 'variavel', category: 'outros', subcategory: 'compras', name: 'Shopping' },

        // ============= CONTAS (Essencial) =============
        'enel': { type: 'essencial', category: 'contas', subcategory: 'energia', name: 'Enel' },
        'copel': { type: 'essencial', category: 'contas', subcategory: 'energia', name: 'Copel' },
        'cemig': { type: 'essencial', category: 'contas', subcategory: 'energia', name: 'Cemig' },
        'sabesp': { type: 'essencial', category: 'contas', subcategory: 'agua', name: 'Sabesp' },
        'sanepar': { type: 'essencial', category: 'contas', subcategory: 'agua', name: 'Sanepar' },
        'copasa': { type: 'essencial', category: 'contas', subcategory: 'agua', name: 'Copasa' },
        'energia': { type: 'essencial', category: 'contas', subcategory: 'energia', name: 'Conta de Energia' },
        'luz': { type: 'essencial', category: 'contas', subcategory: 'energia', name: 'Conta de Luz' },
        'agua': { type: 'essencial', category: 'contas', subcategory: 'agua', name: 'Conta de Água' },
        'internet': { type: 'essencial', category: 'contas', subcategory: 'internet', name: 'Internet' },
        'claro': { type: 'essencial', category: 'contas', subcategory: 'telefone', name: 'Claro' },
        'vivo': { type: 'essencial', category: 'contas', subcategory: 'telefone', name: 'Vivo' },
        'tim': { type: 'essencial', category: 'contas', subcategory: 'telefone', name: 'Tim' },
        'oi': { type: 'essencial', category: 'contas', subcategory: 'telefone', name: 'Oi' },
        'telefone': { type: 'essencial', category: 'contas', subcategory: 'telefone', name: 'Telefone' },
        'celular': { type: 'essencial', category: 'contas', subcategory: 'telefone', name: 'Celular' },
        'aluguel': { type: 'essencial', category: 'contas', subcategory: 'aluguel', name: 'Aluguel' },
        'condominio': { type: 'essencial', category: 'contas', subcategory: 'condominio', name: 'Condomínio' },

        // ============= EDUCAÇÃO E SERVIÇOS (Variável/Essencial) =============
        'udemy': { type: 'variavel', category: 'educacao', subcategory: 'curso', name: 'Udemy' },
        'alura': { type: 'variavel', category: 'educacao', subcategory: 'curso', name: 'Alura' },
        'hotmart': { type: 'variavel', category: 'educacao', subcategory: 'curso', name: 'Hotmart' },
        'curso': { type: 'variavel', category: 'educacao', subcategory: 'curso', name: 'Curso' },
        'faculdade': { type: 'essencial', category: 'educacao', subcategory: 'faculdade', name: 'Faculdade' },
        'universidade': { type: 'essencial', category: 'educacao', subcategory: 'faculdade', name: 'Universidade' },
        'escola': { type: 'essencial', category: 'educacao', subcategory: 'escola', name: 'Escola' },
        'livro': { type: 'variavel', category: 'educacao', subcategory: 'livros', name: 'Livro' },
        'livraria': { type: 'variavel', category: 'educacao', subcategory: 'livros', name: 'Livraria' },
        
        // ============= HOSPEDAGEM / VIAGENS (Variável) =============
        'airbnb': { type: 'variavel', category: 'lazer', subcategory: 'hospedagem', name: 'Airbnb' },
        'booking': { type: 'variavel', category: 'lazer', subcategory: 'hospedagem', name: 'Booking.com' },
        'decolar': { type: 'variavel', category: 'lazer', subcategory: 'passagem', name: 'Decolar' },
        '123milhas': { type: 'variavel', category: 'lazer', subcategory: 'passagem', name: '123 Milhas' },
        'latam': { type: 'variavel', category: 'lazer', subcategory: 'passagem', name: 'Latam' },
        'gol': { type: 'variavel', category: 'lazer', subcategory: 'passagem', name: 'Gol' },
        'azul': { type: 'variavel', category: 'lazer', subcategory: 'passagem', name: 'Azul' },
        'hotel': { type: 'variavel', category: 'lazer', subcategory: 'hospedagem', name: 'Hotel' },
        'pousada': { type: 'variavel', category: 'lazer', subcategory: 'hospedagem', name: 'Pousada' },

        // ============= PETS (Variável) =============
        'cobasi': { type: 'variavel', category: 'pets', subcategory: 'petshop', name: 'Cobasi' },
        'petz': { type: 'variavel', category: 'pets', subcategory: 'petshop', name: 'Petz' },
        'petshop': { type: 'variavel', category: 'pets', subcategory: 'petshop', name: 'Pet Shop' },
        'veterinario': { type: 'essencial', category: 'pets', subcategory: 'veterinario', name: 'Veterinário' },

        // ============= MEIOS DE PAGAMENTO E BANCOS (Outros) =============
        // Normalmente não são os estabelecimentos finais, mas caem aqui como fallback.
        'mercado pago': { type: 'variavel', category: 'outros', subcategory: 'pagamento', name: 'Mercado Pago' },
        'picpay': { type: 'variavel', category: 'outros', subcategory: 'pagamento', name: 'PicPay' },
        'paypal': { type: 'variavel', category: 'outros', subcategory: 'pagamento', name: 'PayPal' },
        'pagseguro': { type: 'variavel', category: 'outros', subcategory: 'pagamento', name: 'PagSeguro' },
        'cielo': { type: 'variavel', category: 'outros', subcategory: 'pagamento', name: 'Cielo' },
        'nubank': { type: 'variavel', category: 'outros', subcategory: 'banco', name: 'Nubank' },
        'inter': { type: 'variavel', category: 'outros', subcategory: 'banco', name: 'Banco Inter' },
        'itau': { type: 'variavel', category: 'outros', subcategory: 'banco', name: 'Itaú' },
        'bradesco': { type: 'variavel', category: 'outros', subcategory: 'banco', name: 'Bradesco' },
        'santander': { type: 'variavel', category: 'outros', subcategory: 'banco', name: 'Santander' },
        'caixa': { type: 'variavel', category: 'outros', subcategory: 'banco', name: 'Caixa Econômica' }
    };

    const paymentIntermediaries = ['mercado pago', 'picpay', 'paypal', 'pagseguro', 'cielo', 'nubank', 'inter', 'itau', 'bradesco', 'santander', 'caixa'];

    // Ordem de busca: maiores palavras primeiro
    const sortedKeywords = Object.entries(establishments).sort((a, b) => b[0].length - a[0].length);

    // Passo 1: Busca o provedor de fato (ignora bancos/meios de pagamento por ora)
    let bestMatch = null;
    for (const [keyword, info] of sortedKeywords) {
        if (!paymentIntermediaries.includes(keyword) && textNorm.includes(keyword)) {
            // Regra especial para 'mercado': não puxar se for só 'mercado livre' ou 'mercado pago'
            if (keyword === 'mercado' && (textNorm.includes('mercado livre') || textNorm.includes('mercado pago'))) {
                continue;
            }
            if (keyword === 'extra' && textNorm.includes('extrato')) {
                continue;
            }

            bestMatch = {
                establishment: info.name,
                category: info.category,
                subcategory: info.subcategory,
                categoryType: info.type,
            };
            break;
        }
    }

    // Passo 2: Se não encontrar, tenta meios de pagamento/bancos
    if (!bestMatch) {
        for (const [keyword, info] of sortedKeywords) {
            if (paymentIntermediaries.includes(keyword) && textNorm.includes(keyword)) {
                bestMatch = {
                    establishment: info.name,
                    category: info.category,
                    subcategory: info.subcategory,
                    categoryType: info.type,
                };
                break;
            }
        }
    }

    return bestMatch || {
        category: 'outros',
        subcategory: 'outros',
        categoryType: 'variavel'
    };
}

/**
 * Processa texto extraído e retorna informações estruturadas
 */
export function parseReceiptText(text: string): ParsedReceipt {
    const amount = extractAmount(text);
    const date = extractDate(text);
    const receiver = extractReceiver(text);
    const { establishment, category, subcategory, categoryType } = identifyEstablishmentAndCategory(text);

    // Se identificarmos que é banco (pix/transf) por fallback mas achamos um 'receiver', é melhor usar o receiver.
    const isPaymentIntermediary = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Banco Inter', 'Caixa Econômica', 'Mercado Pago'].includes(establishment || '');

    let finalEstablishment = establishment;
    let finalDescription = establishment;

    if (receiver) {
        // Se for um banco listado, o estabelecimento real é a pessoa que recebeu!
        if (isPaymentIntermediary || !establishment) {
            finalEstablishment = receiver;
            finalDescription = `Transf/Pix para ${receiver}`;
        } else {
            finalDescription = `${establishment} (${receiver})`;
        }
    }

    return {
        amount,
        date,
        establishment: finalEstablishment || "Desconhecido",
        category,
        subcategory,
        categoryType,
        description: finalDescription,
    };
}
