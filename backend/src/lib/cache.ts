/**
 * 🛡️ ESCUDO DE ESTABILIDADE — In-Memory Cache
 * Cache simples com TTL para reduzir carga no MySQL em hospedagem compartilhada.
 * Garante que consultas pesadas do dashboard não martelem o banco a cada requisição.
 */

interface CacheEntry {
    value: unknown;
    expiresAt: number;
}

class MemoryCache {
    private store: Map<string, CacheEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Limpeza automática a cada 5 minutos para evitar vazamento de memória
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        // Não impede o processo de encerrar
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value as T;
    }

    set(key: string, value: unknown, ttlMs: number): void {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    /**
     * Remove todas as entradas que começam com o prefixo fornecido.
     * Ex: cache.invalidate('dashboard:user-123') remove todos os dados do dashboard daquele usuário.
     */
    invalidate(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    /** Remove TODO o cache (usar apenas em operações admin globais). */
    invalidateAll(): void {
        this.store.clear();
    }

    /** Remove entradas expiradas para liberar memória. */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }

    get size(): number {
        return this.store.size;
    }
}

// Singleton — uma única instância compartilhada entre todos os módulos
export const cache = new MemoryCache();

// TTLs padrão (em milissegundos)
export const TTL = {
    DASHBOARD_OVERVIEW: 2 * 60 * 1000,   // 2 minutos
    WEEKLY_PROGRESS:    3 * 60 * 1000,   // 3 minutos
    MONTHLY_STATS:      5 * 60 * 1000,   // 5 minutos
    FINANCE_CATEGORY:   3 * 60 * 1000,   // 3 minutos
    FINANCE_EVOLUTION:  5 * 60 * 1000,   // 5 minutos
};
