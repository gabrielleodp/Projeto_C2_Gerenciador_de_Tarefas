-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donoId" TEXT NOT NULL,
    CONSTRAINT "Projeto_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "dataPrevista" DATETIME,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletadaEm" DATETIME,
    "projetoId" TEXT NOT NULL,
    "donoId" TEXT NOT NULL,
    CONSTRAINT "Tarefa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tarefa_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
