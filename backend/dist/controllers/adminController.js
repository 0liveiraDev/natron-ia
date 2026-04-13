"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleUserActive = exports.getAllUsers = exports.resetAllXp = void 0;
const prisma_1 = require("../lib/prisma");
const resetAllXp = async (req, res) => {
    try {
        console.log('🔄 Emergency Reset: Zeroing XP for ALL users...');
        const result = await prisma_1.prisma.user.updateMany({
            data: {
                currentXp: 0,
                level: 1,
                rank: 'Estudante da Academia',
                xpPhysical: 0,
                xpDiscipline: 0,
                xpMental: 0,
                xpIntellect: 0,
                xpProductivity: 0,
                xpFinancial: 0,
            }
        });
        console.log(`✅ Reset complete. Impacted ${result.count} users.`);
        res.json({
            message: 'Todas as experiências foram zeradas com sucesso!',
            usersAffected: result.count
        });
    }
    catch (error) {
        console.error('Reset XP error:', error);
        res.status(500).json({ error: 'Erro ao zerar experiências', details: error instanceof Error ? error.message : String(error) });
    }
};
exports.resetAllXp = resetAllXp;
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                level: true,
                rank: true,
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};
exports.getAllUsers = getAllUsers;
const toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        // Não permite que o admin desative a si próprio (prevenção contra acidentes)
        // (Opcional: req.userRole check não foi feito aqui porque idAdmin não tá no authMiddleware nativamente,
        // mas é ideal checar se não tá bloqueando ele mesmo depois).
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id },
            data: {
                isActive: !user.isActive
            }
        });
        res.json({ message: `Conta do usuário ${user.name} foi ${updatedUser.isActive ? 'ativada' : 'desativada'}.`, isActive: updatedUser.isActive });
    }
    catch (error) {
        console.error('Toggle active error:', error);
        res.status(500).json({ error: 'Erro ao alterar status do usuário' });
    }
};
exports.toggleUserActive = toggleUserActive;
