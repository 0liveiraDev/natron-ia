# 🔐 Credenciais de Acesso - Trilha IA

## Usuário Ativo

📧 **Email:** `Brunooliveira1010@hotmail.com`  
🔑 **Senha:** `123456`

---

## Como Fazer Login

1. Acesse: http://localhost:3000
2. Clique em "Entrar" (ou vá direto para `/login`)
3. Digite as credenciais acima
4. Clique em "Entrar"

---

## ✅ Problema Resolvido

O erro de login estava ocorrendo porque a senha do usuário estava incorreta. A senha foi resetada para `123456`.

### O que foi feito:

1. ✅ Verificado que o backend está rodando (porta 3001)
2. ✅ Verificado que o frontend está rodando (porta 3000)
3. ✅ Testado conexão com banco de dados PostgreSQL
4. ✅ Identificado usuário existente no banco
5. ✅ Resetado senha do usuário para `123456`
6. ✅ Testado login via API - funcionando perfeitamente

---

## 🛠️ Scripts Úteis

### Resetar Senha de um Usuário

```bash
cd backend
npx tsx src/reset-password.ts
```

### Verificar Usuários no Banco

```bash
cd backend
npx tsx src/test-db.ts
```

### Criar Novo Usuário

Você pode criar um novo usuário de duas formas:

**Opção 1: Via Interface (Recomendado)**
1. Acesse http://localhost:3000/register
2. Preencha o formulário de cadastro
3. Clique em "Cadastrar"

**Opção 2: Via Prisma Studio**
```bash
cd backend
npx prisma studio
```

---

## 🐛 Troubleshooting

### Erro: "Credenciais inválidas"

**Causa:** Email ou senha incorretos

**Solução:**
1. Verifique se está usando o email correto: `Brunooliveira1010@hotmail.com`
2. Verifique se está usando a senha: `123456`
3. Se ainda não funcionar, execute o script de reset de senha

### Erro: "Erro ao fazer login" (500)

**Causa:** Problema no servidor backend

**Solução:**
1. Verifique se o backend está rodando: http://localhost:3001
2. Verifique os logs do backend no terminal
3. Verifique se o PostgreSQL está rodando
4. Verifique a conexão com o banco de dados

### Erro: "Network Error" ou "ERR_CONNECTION_REFUSED"

**Causa:** Backend não está rodando ou porta incorreta

**Solução:**
1. Inicie o backend:
   ```bash
   cd backend
   npm run dev
   ```
2. Verifique se está rodando na porta 3001
3. Verifique o arquivo `frontend/src/services/api.ts` - deve apontar para `http://localhost:3001/api`

### Página em branco após login

**Causa:** Possível erro no Dashboard ou rotas

**Solução:**
1. Abra o Console do navegador (F12)
2. Verifique se há erros JavaScript
3. Verifique se o token foi salvo no localStorage
4. Tente fazer logout e login novamente

---

## 📝 Notas Importantes

- A senha foi resetada para fins de teste/desenvolvimento
- Em produção, use senhas fortes e seguras
- O token JWT expira em 7 dias
- As credenciais são armazenadas no localStorage do navegador

---

## 🔄 Próximos Passos

Agora que o login está funcionando, você pode:

1. ✅ Acessar o Dashboard redesenhado
2. ✅ Testar as funcionalidades de Tarefas Diárias
3. ✅ Explorar o Dashboard Atlas
4. ✅ Verificar a seção Financeiro
5. ✅ Navegar pelas outras páginas (Hábitos, Tarefas, Finanças, Atlas)

---

**Última atualização:** 01/02/2026 22:55
