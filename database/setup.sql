-- ============================================
-- Trilha IA - Database Setup Script
-- ============================================
-- Este script cria o banco de dados necessário para o sistema Trilha IA
-- Execute este script como usuário postgres

-- Criar o banco de dados
CREATE DATABASE trilha_ia
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'Portuguese_Brazil.1252'
    LC_CTYPE = 'Portuguese_Brazil.1252'
    TEMPLATE = template0;

-- Comentário do banco de dados
COMMENT ON DATABASE trilha_ia IS 'Sistema de Produtividade Pessoal - Trilha IA';

-- Conectar ao banco de dados trilha_ia
\c trilha_ia

-- Criar extensões úteis (opcional, mas recomendado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar se o banco foi criado corretamente
SELECT 'Banco de dados trilha_ia criado com sucesso!' AS status;
