# Natron IA - Sistema de Produtividade Pessoal 🚀

Sistema full-stack de produtividade pessoal com dashboard centralizado, gestão de hábitos, tarefas, finanças e assistente IA integrado (Atlas).

## 🎯 Funcionalidades

- ✅ **Autenticação JWT** - Sistema completo de login e registro
- 📊 **Dashboard** - Visão geral com estatísticas e gráficos
- 🎯 **Hábitos** - Acompanhamento diário com grade mensal
- ✅ **Tarefas** - Gestão de tarefas com status e filtros
- 💰 **Financeiro** - Controle de entradas/saídas com gráficos
- 🤖 **Friday** - Assistente IA que executa ações
- 📡 **Feed de Atividades** - Timeline de todas as ações
- 🎨 **Design Moderno** - Dark mode com glassmorphism e neon

## 🛠️ Stack Tecnológica

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT Authentication
- OpenAI API (GPT-3.5)

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts (gráficos)
- Framer Motion (animações)
- Axios

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- Chave da OpenAI API

## 🚀 Instalação

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/trilha_ia?schema=public"
JWT_SECRET="seu_jwt_secret_super_secreto_aqui"
OPENAI_API_KEY="sua_chave_openai_aqui"
PORT=3001
```

```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar banco de dados e tabelas
npm run prisma:migrate

# Iniciar servidor de desenvolvimento
npm run dev
```

O backend estará rodando em `http://localhost:3001`

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## 📖 Como Usar

### 1. Criar Conta
- Acesse `http://localhost:3000`
- Clique em "Cadastre-se"
- Preencha seus dados e crie sua conta

### 2. Dashboard
- Visualize resumo do dia
- Acompanhe progresso mensal
- Veja grade de hábitos

### 3. Hábitos
- Crie novos hábitos
- Marque como concluído diariamente
- Visualize histórico dos últimos 7 dias

### 4. Tarefas
- Crie tarefas com título, descrição e data
- Marque como concluída
- Filtre por status (todas, pendentes, concluídas)

### 5. Financeiro
- Registre entradas e saídas
- Categorize transações
- Visualize gráficos e estatísticas

### 6. Friday (Assistente IA)
- Converse com o Friday
- Peça para criar tarefas: "Crie uma tarefa para estudar React"
- Registre gastos: "Registre gasto de 50 reais em alimentação"
- Peça resumos e sugestões

## 🤖 Comandos da Friday

O Friday pode executar ações automaticamente:

- **Criar Tarefas**: "Crie uma tarefa para [descrição]"
- **Registrar Gastos**: "Registre gasto de [valor] reais em [categoria]"
- **Registrar Entradas**: "Registre entrada de [valor] reais"
- **Categorias**: alimentacao, assinaturas, lazer, outros

## 📁 Estrutura do Projeto

```
trilha-ia/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── contexts/
    │   ├── pages/
    │   ├── services/
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

## 🎨 Design System

- **Cores Principais**:
  - Neon Green: `#00ff88`
  - Neon Blue: `#00d4ff`
  - Neon Purple: `#b800ff`
  
- **Efeitos**:
  - Glassmorphism
  - Backdrop blur
  - Neon glow
  - Smooth animations

## 🔧 Scripts Úteis

### Backend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run prisma:studio # Interface visual do banco
```

### Frontend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview da build
```

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`
- Execute `npm run prisma:migrate` novamente

### Erro na API do Atlas
- Verifique se a `OPENAI_API_KEY` está correta
- Confirme se tem créditos na conta OpenAI

### Erro de CORS
- Verifique se o backend está rodando na porta 3001
- Confirme a configuração de CORS no `server.ts`

## 📝 Licença

MIT

## 👨‍💻 Desenvolvido com

- ❤️ Paixão por código
- ☕ Muito café
- 🎵 Boa música

---

**Natron IA** - Seu segundo cérebro digital 🧠✨
