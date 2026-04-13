import { PrismaClient } from '@prisma/client';

// 🛡️ ESCUDO DE ESTABILIDADE — Pool otimizado para Hostinger (hospedagem compartilhada)
// connection_limit=5 → máximo de 5 conexões simultâneas ao MySQL
// pool_timeout=10   → desiste de esperar conexão do pool após 10 segundos
// connect_timeout=10 → desiste de conectar ao servidor MySQL após 10 segundos
function buildDatabaseUrl(): string {
    const base = process.env.DATABASE_URL || '';
    if (!base) return base;

    try {
        const url = new URL(base);
        // Aplica limites de pool apenas se ainda não configurados
        if (!url.searchParams.has('connection_limit')) {
            url.searchParams.set('connection_limit', '5');
        }
        if (!url.searchParams.has('pool_timeout')) {
            url.searchParams.set('pool_timeout', '10');
        }
        if (!url.searchParams.has('connect_timeout')) {
            url.searchParams.set('connect_timeout', '10');
        }
        return url.toString();
    } catch {
        return base;
    }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // Em produção: apenas erros. Em dev: avisos + erros.
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        datasources: {
            db: { url: buildDatabaseUrl() },
        },
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
