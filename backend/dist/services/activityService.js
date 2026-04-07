"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const logActivity = async (userId, type, description) => {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                type,
                description,
            },
        });
    }
    catch (error) {
        console.error('Error logging activity:', error);
    }
};
exports.logActivity = logActivity;
