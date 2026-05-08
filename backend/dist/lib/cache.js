"use strict";
/**
 * 🛡️ ESCUDO DE ESTABILIDADE — In-Memory Cache
 * Cache simples com TTL para reduzir carga no MySQL em hospedagem compartilhada.
 * Garante que consultas pesadas do dashboard não martelem o banco a cada requisição.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTL = exports.cache = void 0;
class MemoryCache {
    constructor() {
        this.store = new Map();
        // Limpeza automática a cada 5 minutos para evitar vazamento de memória
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        // Não impede o processo de encerrar
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }
    /**
     * Remove todas as entradas que começam com o prefixo fornecido.
     * Ex: cache.invalidate('dashboard:user-123') remove todos os dados do dashboard daquele usuário.
     */
    invalidate(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
    /** Remove TODO o cache (usar apenas em operações admin globais). */
    invalidateAll() {
        this.store.clear();
    }
    /** Remove entradas expiradas para liberar memória. */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    get size() {
        return this.store.size;
    }
}
// Singleton — uma única instância compartilhada entre todos os módulos
exports.cache = new MemoryCache();
// TTLs padrão (em milissegundos)
exports.TTL = {
    DASHBOARD_OVERVIEW: 2 * 60 * 1000, // 2 minutos
    WEEKLY_PROGRESS: 3 * 60 * 1000, // 3 minutos
    MONTHLY_STATS: 5 * 60 * 1000, // 5 minutos
    FINANCE_CATEGORY: 3 * 60 * 1000, // 3 minutos
    FINANCE_EVOLUTION: 5 * 60 * 1000, // 5 minutos
};
