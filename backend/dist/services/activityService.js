"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const prisma_1 = require("../lib/prisma");
const logActivity = async (userId, type, description) => {
    try {
        await prisma_1.prisma.activityLog.create({
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
