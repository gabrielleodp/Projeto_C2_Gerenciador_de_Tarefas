# 📋 Task Manager API

API REST para gerenciamento de tarefas por projetos.  
Construída com **Node.js + TypeScript + Express + Prisma + SQLite + JWT**.

---

## 🗂️ Domínio

Sistema onde usuários criam **projetos** e organizam **tarefas** dentro deles.  
Cada tarefa tem prioridade, status e suporte a soft delete.

### Entidades

| Entidade | Descrição |
|----------|-----------|
| **User** | Usuário autenticado, pode ser `USER` ou `ADMIN` |
| **Projeto** | Agrupa tarefas; pertence a um User |
| **Tarefa** | Pertence a um Projeto e a um User; suporta soft delete |

---

## 🚀 Instalação e execução

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/task-manager-api
cd task-manager-api

# 2. Instale as dependências
npm install

# 3. Copie o arquivo de variáveis de ambiente
copy .env.example .env
# Edite o .env e defina um JWT_SECRET seguro

# 4. Execute as migrations e gere o cliente Prisma
npx prisma migrate dev --name init

# 5. Inicie o servidor em modo desenvolvimento
npm run dev
```

O servidor estará rodando em **http://localhost:3000**

---

## 🧪 Rodando os testes

```bash
# Rodar todos os testes
npm test

# Rodar com relatório de cobertura
npm run test:coverage
```

> O banco de testes (`prisma/test.db`) é criado e destruído automaticamente.

---

## 📦 Estrutura do projeto

```
task-manager/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── lib/
│   │   ├── prisma.ts          # Instância do Prisma Client
│   │   └── auth.ts            # hash, verify, gerarToken, verificarToken
│   ├── middlewares/
│   │   ├── authenticate.ts    # Valida o JWT e injeta req.usuario
│   │   └── authorize.ts       # Controle de roles (USER / ADMIN)
│   ├── routes/
│   │   ├── auth.ts            # /auth/register, /auth/login, /auth/me
│   │   ├── users.ts           # /users (somente ADMIN)
│   │   ├── projetos.ts        # CRUD de projetos
│   │   └── tarefas.ts         # CRUD de tarefas (com filtros e paginação)
│   ├── schemas/
│   │   └── index.ts           # Schemas Zod para validação
│   ├── app.ts                 # createApp() — para os testes
│   └── server.ts              # Bootstrap / entry point
├── tests/
│   ├── unit/
│   │   ├── auth.test.ts       # Testes de hash e JWT
│   │   └── schemas.test.ts    # Testes dos schemas Zod
│   ├── integration/
│   │   ├── auth.test.ts       # Testes de registro, login, /me
│   │   └── projetos-tarefas.test.ts  # CRUD, ownership, roles
│   └── setup.ts               # Banco isolado para testes
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🔗 Rotas

### Auth — `/auth`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/register` | ❌ | Cria nova conta |
| POST | `/auth/login` | ❌ | Retorna JWT |
| GET | `/auth/me` | ✅ | Dados do usuário autenticado |

### Users — `/users`

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/users` | ADMIN | Lista todos os usuários |
| GET | `/users/:id` | ADMIN | Busca usuário por ID |
| DELETE | `/users/:id` | ADMIN | Remove usuário |

### Projetos — `/projetos`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/projetos` | ✅ | Lista projetos do usuário |
| GET | `/projetos/:id` | ✅ (dono/ADMIN) | Busca projeto com tarefas |
| POST | `/projetos` | ✅ | Cria projeto |
| PUT | `/projetos/:id` | ✅ (somente dono) | Atualiza projeto |
| DELETE | `/projetos/:id` | ✅ (somente dono) | Remove projeto |

### Tarefas — `/tarefas`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/tarefas` | ✅ | Lista tarefas (filtros + paginação) |
| GET | `/tarefas/:id` | ✅ (dono/ADMIN) | Busca tarefa por ID |
| POST | `/tarefas` | ✅ | Cria tarefa |
| PUT | `/tarefas/:id` | ✅ (somente dono) | Atualiza tarefa |
| DELETE | `/tarefas/:id` | ✅ (somente dono) | Soft delete |

**Filtros disponíveis em `GET /tarefas`:**
```
?status=aberta|em_andamento|concluida
?prioridade=baixa|media|alta
?projetoId=xxx
?page=1&limit=10
```

---

## 📡 Exemplos de requisição

### Registrar usuário
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome": "João Silva", "email": "joao@email.com", "senha": "senha123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "joao@email.com", "senha": "senha123"}'
```

### Criar projeto (com token)
```bash
curl -X POST http://localhost:3000/projetos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Projeto TCC", "descricao": "Organizar o TCC"}'
```

### Criar tarefa
```bash
curl -X POST http://localhost:3000/tarefas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Escrever introdução", "projetoId": "ID_DO_PROJETO", "prioridade": "alta"}'
```

### Listar tarefas com filtros
```bash
curl "http://localhost:3000/tarefas?prioridade=alta&status=aberta&page=1&limit=5" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## ✅ Funcionalidades extras implementadas

- **Soft delete** em `Tarefa` (campo `deletadaEm`)
- **Paginação** em `GET /tarefas` (`?page` e `?limit`)
- **Filtros múltiplos** em tarefas (status, prioridade, projetoId)

---

## 🔐 Variáveis de ambiente

Veja `.env.example` para todas as variáveis necessárias.

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Caminho do banco SQLite | `file:./prisma/dev.db` |
| `JWT_SECRET` | Chave secreta para assinar tokens | — |
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente de execução | `development` |
