# 🗄️ Configuração do Banco de Dados - Trilha IA

Este guia irá ajudá-lo a configurar o banco de dados PostgreSQL para o sistema Trilha IA.

## 📋 Pré-requisitos

- PostgreSQL 15+ instalado
- Acesso ao usuário `postgres` (usuário padrão do PostgreSQL)

## 🚀 Método 1: Usando o Script SQL (Recomendado)

### Passo 1: Executar o script de setup

Abra o terminal/PowerShell e execute:

```bash
# Navegue até a pasta do projeto
cd C:\Users\Administrator\.gemini\antigravity\scratch\trilha-ia

# Execute o script SQL
psql -U postgres -f database/setup.sql
```

Quando solicitado, digite a senha do usuário `postgres` que você definiu durante a instalação.

### Passo 2: Verificar se o banco foi criado

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Listar todos os bancos de dados
\l

# Você deve ver 'trilha_ia' na lista
# Para sair
\q
```

## 🔧 Método 2: Criação Manual

Se preferir criar o banco manualmente:

### Opção A: Usando pgAdmin (Interface Gráfica)

1. Abra o **pgAdmin** (instalado junto com PostgreSQL)
2. Conecte-se ao servidor local
3. Clique com botão direito em **Databases** → **Create** → **Database**
4. Nome: `trilha_ia`
5. Owner: `postgres`
6. Clique em **Save**

### Opção B: Usando linha de comando

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar o banco de dados
CREATE DATABASE trilha_ia;

# Verificar
\l

# Sair
\q
```

## ⚙️ Configurar o Backend

Após criar o banco de dados, você precisa configurar o backend:

### 1. Verificar o arquivo .env

Navegue até a pasta `backend` e verifique se o arquivo `.env` existe:

```bash
cd backend
```

Se o arquivo `.env` não existir, crie-o com o seguinte conteúdo:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trilha_ia?schema=public"

# JWT
JWT_SECRET="seu_jwt_secret_super_secreto_aqui_mude_isso_em_producao"

# OpenAI (opcional - o Atlas funciona sem isso)
OPENAI_API_KEY=""

# Server
PORT=3001
```

> **⚠️ IMPORTANTE**: Se você usou uma senha diferente de `postgres` durante a instalação do PostgreSQL, altere a parte `postgres:postgres` para `postgres:SUA_SENHA`.

### 2. Instalar dependências

```bash
npm install
```

### 3. Gerar Prisma Client

```bash
npm run prisma:generate
```

### 4. Executar Migrações (Criar Tabelas)

```bash
npm run prisma:migrate
```

Quando perguntado o nome da migração, digite: `init`

Este comando irá criar todas as tabelas necessárias:
- ✅ `User` - Usuários do sistema
- ✅ `Habit` - Hábitos
- ✅ `HabitLog` - Registros de hábitos
- ✅ `Task` - Tarefas
- ✅ `Transaction` - Transações financeiras
- ✅ `ActivityLog` - Log de atividades

### 5. Verificar as tabelas criadas

```bash
# Abrir Prisma Studio (interface visual)
npm run prisma:studio
```

Ou via linha de comando:

```bash
psql -U postgres -d trilha_ia

# Listar todas as tabelas
\dt

# Você deve ver:
# - User
# - Habit
# - HabitLog
# - Task
# - Transaction
# - ActivityLog
# - _prisma_migrations

# Sair
\q
```

## 🎯 Iniciar o Sistema

Após configurar o banco de dados:

### 1. Iniciar o Backend

```bash
cd backend
npm run dev
```

Você deve ver: `🚀 Server running on http://localhost:3001`

### 2. Iniciar o Frontend (em outro terminal)

```bash
cd frontend
npm run dev
```

Você deve ver: `Local: http://localhost:3000`

### 3. Acessar o Sistema

Abra o navegador em: **http://localhost:3000**

## 📊 Estrutura do Banco de Dados

O banco de dados possui as seguintes tabelas:

### User
- `id` (UUID) - Identificador único
- `name` - Nome do usuário
- `email` - Email (único)
- `password` - Senha (hash)
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

### Habit
- `id` (UUID) - Identificador único
- `title` - Título do hábito
- `description` - Descrição (opcional)
- `userId` - Referência ao usuário
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

### HabitLog
- `id` (UUID) - Identificador único
- `habitId` - Referência ao hábito
- `date` - Data do registro
- `completed` - Se foi completado
- `createdAt` - Data de criação

### Task
- `id` (UUID) - Identificador único
- `title` - Título da tarefa
- `description` - Descrição (opcional)
- `status` - Status (pending/completed)
- `dueDate` - Data de vencimento (opcional)
- `userId` - Referência ao usuário
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

### Transaction
- `id` (UUID) - Identificador único
- `amount` - Valor
- `type` - Tipo (entrada/saida)
- `category` - Categoria (alimentacao, assinaturas, lazer, outros)
- `description` - Descrição (opcional)
- `date` - Data da transação
- `userId` - Referência ao usuário
- `createdAt` - Data de criação
- `updatedAt` - Data de atualização

### ActivityLog
- `id` (UUID) - Identificador único
- `type` - Tipo de atividade
- `description` - Descrição
- `userId` - Referência ao usuário
- `createdAt` - Data de criação

## ❓ Problemas Comuns

### Erro: "psql: command not found"

O PostgreSQL não está no PATH do sistema.

**Solução**:
1. Encontre onde o PostgreSQL foi instalado (geralmente `C:\Program Files\PostgreSQL\15\bin`)
2. Use o caminho completo:
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
```

### Erro: "password authentication failed"

A senha está incorreta.

**Solução**:
- Verifique a senha que você definiu durante a instalação do PostgreSQL
- Atualize o arquivo `backend/.env` com a senha correta

### Erro: "database trilha_ia already exists"

O banco já foi criado anteriormente.

**Solução**:
- Isso é normal! Pule para a etapa de configuração do backend
- Se quiser recriar o banco:
```bash
psql -U postgres
DROP DATABASE trilha_ia;
CREATE DATABASE trilha_ia;
\q
```

### Erro: "connect ECONNREFUSED"

O PostgreSQL não está rodando.

**Solução**:
1. Abra o **pgAdmin** - isso iniciará o serviço
2. Ou inicie o serviço manualmente:
   - Windows: Abra "Serviços" e inicie "postgresql-x64-15"

## 🔍 Comandos Úteis

```bash
# Conectar ao banco
psql -U postgres -d trilha_ia

# Listar tabelas
\dt

# Descrever uma tabela
\d "User"

# Ver dados de uma tabela
SELECT * FROM "User";

# Limpar todos os dados (cuidado!)
TRUNCATE "User", "Habit", "HabitLog", "Task", "Transaction", "ActivityLog" CASCADE;

# Sair
\q
```

## 📞 Suporte

Se encontrar problemas:

1. ✅ PostgreSQL está instalado?
2. ✅ O serviço PostgreSQL está rodando?
3. ✅ A senha no `.env` está correta?
4. ✅ O banco `trilha_ia` foi criado?
5. ✅ As migrações foram executadas?

---

**Pronto! Seu banco de dados está configurado! 🎉**
