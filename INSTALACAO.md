# 🚀 Guia Rápido de Instalação - Trilha IA

## Passo 1: Instalar PostgreSQL

### Windows

1. **Baixe o PostgreSQL**:
   - Acesse: https://www.postgresql.org/download/windows/
   - Baixe o instalador (versão 15 ou superior)

2. **Execute o instalador**:
   - Clique em "Next" até chegar em "Password"
   - **IMPORTANTE**: Defina a senha como `postgres` (ou anote a senha que escolher)
   - Porta padrão: `5432` (deixe como está)
   - Continue clicando em "Next" até finalizar

3. **Verificar instalação**:
   ```bash
   psql --version
   ```

## Passo 2: Criar o Banco de Dados

Abra o **pgAdmin** (instalado junto com PostgreSQL) ou use o terminal:

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar o banco de dados
CREATE DATABASE trilha_ia;

# Sair
\q
```

## Passo 3: Configurar o Backend

1. **Abra o arquivo `.env`** em `backend/.env`

2. **Se você usou senha diferente**, edite a linha:
   ```
   DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/trilha_ia?schema=public"
   ```

3. **Instalar dependências** (se ainda não instalou):
   ```bash
   cd backend
   npm install
   ```

4. **Executar migrações** (criar tabelas):
   ```bash
   npm run prisma:migrate
   ```
   - Quando perguntar o nome da migração, digite: `init`

5. **Gerar Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

6. **Iniciar o servidor**:
   ```bash
   npm run dev
   ```
   
   ✅ Você deve ver: `🚀 Server running on http://localhost:3001`

## Passo 4: Configurar o Frontend

Abra um **NOVO terminal** (deixe o backend rodando):

```bash
cd frontend
npm install
npm run dev
```

✅ Você deve ver: `Local: http://localhost:3000`

## Passo 5: Acessar o Sistema

1. Abra o navegador em: **http://localhost:3000**
2. Clique em **"Cadastre-se"**
3. Crie sua conta
4. Comece a usar! 🎉

---

## 🤖 Como Usar o Atlas (Assistente Local)

O Atlas agora funciona **SEM necessidade de API externa**! Experimente:

### Criar Tarefas
- "Crie uma tarefa para estudar React"
- "Nova tarefa: Fazer exercícios"
- "Adicionar tarefa comprar leite"

### Registrar Gastos
- "Registre gasto de 50 reais em alimentação"
- "Gastei 30 em lazer"
- "Despesa de 100 reais em assinaturas"

### Registrar Entradas
- "Registre entrada de 1000 reais"
- "Recebi 500"
- "Ganhei 2000 reais"

### Ver Progresso
- "Como está meu progresso?"
- "Mostre minhas estatísticas"

---

## ❓ Problemas Comuns

### Erro: "connect ECONNREFUSED"
- PostgreSQL não está rodando
- **Solução**: Abra o pgAdmin ou inicie o serviço PostgreSQL

### Erro: "password authentication failed"
- Senha incorreta no `.env`
- **Solução**: Edite `backend/.env` com a senha correta

### Porta 3000 ou 3001 em uso
- **Solução**: Feche outros programas usando essas portas ou mude a porta no código

---

## 📞 Suporte

Se tiver problemas, verifique:
1. PostgreSQL está instalado e rodando?
2. O banco `trilha_ia` foi criado?
3. As migrações foram executadas?
4. Os dois servidores (backend e frontend) estão rodando?

**Boa produtividade! 🚀**
