-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPERVISOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Posto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Diarista" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Motivo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CargaHoraria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "MeioPagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Cobertura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "valor" DECIMAL NOT NULL,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "postoId" TEXT NOT NULL,
    "diaristaId" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "motivoId" TEXT NOT NULL,
    "cargaHorariaId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "aprovadorId" TEXT,
    "dataAprovacao" DATETIME,
    "financeiroId" TEXT,
    "dataPagamento" DATETIME,
    "meioPagamentoSolicitadoId" TEXT NOT NULL,
    "meioPagamentoEfetivadoId" TEXT,
    "ajusteSolicitado" TEXT,
    "respostaAjuste" TEXT,
    "justificativaReprovacao" TEXT,
    "justificativaPagamento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cobertura_postoId_fkey" FOREIGN KEY ("postoId") REFERENCES "Posto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_diaristaId_fkey" FOREIGN KEY ("diaristaId") REFERENCES "Diarista" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "Motivo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_cargaHorariaId_fkey" FOREIGN KEY ("cargaHorariaId") REFERENCES "CargaHoraria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_financeiroId_fkey" FOREIGN KEY ("financeiroId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_meioPagamentoSolicitadoId_fkey" FOREIGN KEY ("meioPagamentoSolicitadoId") REFERENCES "MeioPagamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobertura_meioPagamentoEfetivadoId_fkey" FOREIGN KEY ("meioPagamentoEfetivadoId") REFERENCES "MeioPagamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "coberturaId" TEXT,
    "auditUpload" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Anexo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Anexo_coberturaId_fkey" FOREIGN KEY ("coberturaId") REFERENCES "Cobertura" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricoWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coberturaId" TEXT NOT NULL,
    "deStatus" TEXT,
    "paraStatus" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    CONSTRAINT "HistoricoWorkflow_coberturaId_fkey" FOREIGN KEY ("coberturaId") REFERENCES "Cobertura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HistoricoWorkflow_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
