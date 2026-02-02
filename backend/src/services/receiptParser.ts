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
 * Extrai valor monetário do texto
 */
function extractAmount(text: string): number | undefined {
    // Padrões para valores em reais (ordem de especificidade)
    const patterns = [
        /R\$\s*(\d+[.,]\d{2})/i,                    // R$ 19,13 ou R$19.13
        /valor[:\s]+R?\$?\s*(\d+[.,]\d{2})/i,      // Valor: 19,13
        /total[:\s]+R?\$?\s*(\d+[.,]\d{2})/i,      // Total: 19,13
        /pagamento[:\s]+R?\$?\s*(\d+[.,]\d{2})/i,  // Pagamento: 19,13
        /(\d+[.,]\d{2})\s*reais?/i,                 // 19,13 reais
        /^(\d+[.,]\d{2})$/m,                        // Apenas número com 2 decimais em linha própria
        /\b(\d{1,4}[.,]\d{2})\b/,                   // Qualquer número com 2 decimais (último recurso)
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const value = match[1].replace(',', '.');
            const numValue = parseFloat(value);
            // Validar que é um valor razoável (entre 0.01 e 99999.99)
            if (numValue > 0 && numValue < 100000) {
                return numValue;
            }
        }
    }

    return undefined;
}


/**
 * Extrai data do texto
 */
function extractDate(text: string): Date | undefined {
    const textLower = text.toLowerCase();

    // Mapeamento de meses em português
    const monthMap: Record<string, number> = {
        'janeiro': 0, 'jan': 0,
        'fevereiro': 1, 'fev': 1,
        'março': 2, 'mar': 2,
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

    // Padrões de data (ordem de especificidade)
    const patterns = [
        // Mercado Pago: "Segunda-feira, 29 de dezembro de 2025, às 10:44:50"
        // Nubank: "15 de janeiro de 2025"
        {
            regex: /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
            extract: (match: RegExpMatchArray) => {
                const day = parseInt(match[1]);
                const monthName = match[2].toLowerCase();
                const year = parseInt(match[3]);
                const month = monthMap[monthName];

                if (month !== undefined) {
                    return new Date(year, month, day);
                }
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
        },

        // "Data: DD/MM/YYYY"
        {
            regex: /data[:\s]+(\d{2})\/(\d{2})\/(\d{4})/i,
            extract: (match: RegExpMatchArray) => {
                const day = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const year = parseInt(match[3]);
                return new Date(year, month, day);
            }
        },
    ];

    for (const pattern of patterns) {
        const match = textLower.match(pattern.regex);
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
 * Identifica estabelecimento, categoria e subcategoria
 */
function identifyEstablishmentAndCategory(text: string): {
    establishment?: string;
    category?: string;
    subcategory?: string;
    categoryType?: 'essencial' | 'variavel'
} {
    const textLower = text.toLowerCase();

    // Mapeamento hierárquico: estabelecimento -> { tipo, categoria, subcategoria }
    const establishments = {
        // ALIMENTAÇÃO - Delivery/Fora (Variável)
        'ifood': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'delivery_ifood',
            name: 'iFood'
        },
        'next': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'delivery_ifood',
            name: 'Next (iFood)'
        },
        'uber eats': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'delivery_uber',
            name: 'Uber Eats'
        },
        'rappi': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'delivery_rappi',
            name: 'Rappi'
        },
        'restaurante': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'restaurante',
            name: 'Restaurante'
        },
        'lanchonete': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'lanchonete',
            name: 'Lanchonete'
        },
        'bar': {
            type: 'variavel' as const,
            category: 'alimentacao',
            subcategory: 'bar',
            name: 'Bar'
        },

        // ALIMENTAÇÃO - Básica (Essencial)
        'mercado': {
            type: 'essencial' as const,
            category: 'alimentacao',
            subcategory: 'mercado',
            name: 'Mercado'
        },
        'supermercado': {
            type: 'essencial' as const,
            category: 'alimentacao',
            subcategory: 'mercado',
            name: 'Supermercado'
        },
        'feira': {
            type: 'essencial' as const,
            category: 'alimentacao',
            subcategory: 'feira',
            name: 'Feira'
        },
        'padaria': {
            type: 'essencial' as const,
            category: 'alimentacao',
            subcategory: 'padaria',
            name: 'Padaria'
        },

        // TRANSPORTE - Variável
        'uber': {
            type: 'variavel' as const,
            category: 'transporte',
            subcategory: 'uber',
            name: 'Uber'
        },
        '99': {
            type: 'variavel' as const,
            category: 'transporte',
            subcategory: '99',
            name: '99'
        },
        'taxi': {
            type: 'variavel' as const,
            category: 'transporte',
            subcategory: 'taxi',
            name: 'Taxi'
        },

        // TRANSPORTE - Essencial
        'posto': {
            type: 'essencial' as const,
            category: 'transporte',
            subcategory: 'combustivel',
            name: 'Posto de Combustível'
        },
        'combustivel': {
            type: 'essencial' as const,
            category: 'transporte',
            subcategory: 'combustivel',
            name: 'Combustível'
        },
        'gasolina': {
            type: 'essencial' as const,
            category: 'transporte',
            subcategory: 'combustivel',
            name: 'Gasolina'
        },

        // ASSINATURAS (Variável)
        'netflix': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'streaming',
            name: 'Netflix'
        },
        'spotify': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'streaming',
            name: 'Spotify'
        },
        'amazon': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'streaming',
            name: 'Amazon Prime'
        },
        'disney': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'streaming',
            name: 'Disney+'
        },
        'hbo': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'streaming',
            name: 'HBO Max'
        },
        'youtube': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'streaming',
            name: 'YouTube Premium'
        },
        'academia': {
            type: 'variavel' as const,
            category: 'assinaturas',
            subcategory: 'academia',
            name: 'Academia'
        },

        // LAZER (Variável)
        'cinema': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'cinema',
            name: 'Cinema'
        },
        'teatro': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'teatro',
            name: 'Teatro'
        },
        'show': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'show',
            name: 'Show'
        },

        // SAÚDE (Essencial)
        'farmacia': {
            type: 'essencial' as const,
            category: 'saude',
            subcategory: 'farmacia',
            name: 'Farmácia'
        },
        'drogaria': {
            type: 'essencial' as const,
            category: 'saude',
            subcategory: 'farmacia',
            name: 'Drogaria'
        },
        'hospital': {
            type: 'essencial' as const,
            category: 'saude',
            subcategory: 'hospital',
            name: 'Hospital'
        },
        'clinica': {
            type: 'essencial' as const,
            category: 'saude',
            subcategory: 'clinica',
            name: 'Clínica'
        },

        // HOSPEDAGEM / VIAGENS (Variável)
        'airbnb': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'hospedagem',
            name: 'Airbnb'
        },
        'booking': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'hospedagem',
            name: 'Booking.com'
        },
        'hotel': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'hospedagem',
            name: 'Hotel'
        },
        'pousada': {
            type: 'variavel' as const,
            category: 'lazer',
            subcategory: 'hospedagem',
            name: 'Pousada'
        },

        // PAGAMENTOS / INTERMEDIÁRIOS (Outros)
        'mercado pago': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'pagamento',
            name: 'Mercado Pago'
        },
        'picpay': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'pagamento',
            name: 'PicPay'
        },
        'paypal': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'pagamento',
            name: 'PayPal'
        },

        // E-COMMERCE (Variável)
        'amazon': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'Amazon'
        },
        'mercado livre': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'Mercado Livre'
        },
        'shopee': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'Shopee'
        },
        'aliexpress': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'AliExpress'
        },
        'shein': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'Shein'
        },
        'magazine luiza': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'Magazine Luiza'
        },
        'americanas': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'compras_online',
            name: 'Americanas'
        },

        // CONTAS / UTILITIES (Essencial)
        'energia': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'energia',
            name: 'Conta de Energia'
        },
        'luz': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'energia',
            name: 'Conta de Luz'
        },
        'agua': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'agua',
            name: 'Conta de Água'
        },
        'internet': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'internet',
            name: 'Internet'
        },
        'telefone': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'telefone',
            name: 'Telefone'
        },
        'celular': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'telefone',
            name: 'Celular'
        },
        'aluguel': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'aluguel',
            name: 'Aluguel'
        },
        'condominio': {
            type: 'essencial' as const,
            category: 'contas',
            subcategory: 'condominio',
            name: 'Condomínio'
        },

        // EDUCAÇÃO (Essencial/Variável)
        'curso': {
            type: 'variavel' as const,
            category: 'educacao',
            subcategory: 'curso',
            name: 'Curso'
        },
        'faculdade': {
            type: 'essencial' as const,
            category: 'educacao',
            subcategory: 'faculdade',
            name: 'Faculdade'
        },
        'universidade': {
            type: 'essencial' as const,
            category: 'educacao',
            subcategory: 'faculdade',
            name: 'Universidade'
        },
        'escola': {
            type: 'essencial' as const,
            category: 'educacao',
            subcategory: 'escola',
            name: 'Escola'
        },
        'livro': {
            type: 'variavel' as const,
            category: 'educacao',
            subcategory: 'livros',
            name: 'Livro'
        },
        'livraria': {
            type: 'variavel' as const,
            category: 'educacao',
            subcategory: 'livros',
            name: 'Livraria'
        },

        // SERVIÇOS PESSOAIS (Variável)
        'barbeiro': {
            type: 'variavel' as const,
            category: 'servicos',
            subcategory: 'beleza',
            name: 'Barbeiro'
        },
        'barbearia': {
            type: 'variavel' as const,
            category: 'servicos',
            subcategory: 'beleza',
            name: 'Barbearia'
        },
        'salao': {
            type: 'variavel' as const,
            category: 'servicos',
            subcategory: 'beleza',
            name: 'Salão de Beleza'
        },
        'manicure': {
            type: 'variavel' as const,
            category: 'servicos',
            subcategory: 'beleza',
            name: 'Manicure'
        },
        'estetica': {
            type: 'variavel' as const,
            category: 'servicos',
            subcategory: 'beleza',
            name: 'Estética'
        },
        'lavanderia': {
            type: 'variavel' as const,
            category: 'servicos',
            subcategory: 'limpeza',
            name: 'Lavanderia'
        },

        // PETS (Variável)
        'petshop': {
            type: 'variavel' as const,
            category: 'pets',
            subcategory: 'petshop',
            name: 'Pet Shop'
        },
        'veterinario': {
            type: 'essencial' as const,
            category: 'pets',
            subcategory: 'veterinario',
            name: 'Veterinário'
        },

        // BANCOS (Outros)
        'nubank': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'banco',
            name: 'Nubank'
        },
        'inter': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'banco',
            name: 'Banco Inter'
        },
        'itau': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'banco',
            name: 'Itaú'
        },
        'bradesco': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'banco',
            name: 'Bradesco'
        },
        'santander': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'banco',
            name: 'Santander'
        },
        'caixa': {
            type: 'variavel' as const,
            category: 'outros',
            subcategory: 'banco',
            name: 'Caixa Econômica'
        },
    };

    // Sort keywords by length (longest first) to avoid false matches
    // Example: "mercado pago" should match before "mercado"
    const sortedKeywords = Object.entries(establishments).sort((a, b) => b[0].length - a[0].length);

    for (const [keyword, info] of sortedKeywords) {
        if (textLower.includes(keyword)) {
            return {
                establishment: info.name,
                category: info.category,
                subcategory: info.subcategory,
                categoryType: info.type,
            };
        }
    }

    return {
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
    const { establishment, category, subcategory, categoryType } = identifyEstablishmentAndCategory(text);

    return {
        amount,
        date,
        establishment,
        category,
        subcategory,
        categoryType,
        description: establishment,
    };
}
