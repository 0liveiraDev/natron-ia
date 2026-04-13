import { prisma } from '../lib/prisma';

export const logActivity = async (
    userId: string,
    type: string,
    description: string
) => {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                type,
                description,
            },
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};
