-- ============================================
-- Trilha IA - Database Setup Script (SQLite)
-- ============================================
-- Este projeto agora usa SQLite via Prisma ORM.
-- O banco de dados é criado automaticamente pelo Prisma.
-- NÃO é necessário executar este script manualmente.

-- Para criar o banco de dados local:
--   cd backend
--   npx prisma migrate dev --name init

-- Para visualizar o banco:
--   npx prisma studio

-- Para deploy na Hostinger (MySQL):
--   1. Altere o provider no schema.prisma de "sqlite" para "mysql"
--   2. Atualize a DATABASE_URL no .env:
--      DATABASE_URL="mysql://usuario:senha@host:3306/nome_do_banco"
--   3. Execute: npx prisma migrate dev --name init_mysql
