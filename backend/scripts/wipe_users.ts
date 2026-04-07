import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('⚠️  WIPING ALL USERS FROM DATABASE...\n');

    try {
        // Cascade delete will handle all relations
        const result = await prisma.user.deleteMany({});
        console.log(`✅ Success! Removed ${result.count} users and all associated data.`);

        // Clear uploads folders
        const uploadDirs = ['uploads/receipts', 'uploads/avatars'];
        uploadDirs.forEach(dir => {
            const dirPath = path.join(process.cwd(), dir);
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    if (file !== '.gitkeep') {
                        fs.unlinkSync(path.join(dirPath, file));
                    }
                }
                console.log(`🧹 Cleared directory: ${dir}`);
            }
        });
    } catch (error) {
        console.error('❌ Error wiping users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
