import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile } from "fs/promises"
import { join } from "path"
import bcrypt from "bcryptjs"
import { sendPixTransfer, getPixAddressKeyDetails, areNamesSimilar } from "@/lib/asaas"

// GET: List items waiting for payment (Status = APROVADO) + Payment Methods
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN' && user.role !== 'APROVADOR_N2') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""

    try {
        const where: any = { status: 'APROVADO' }

        if (search) {
            where.OR = [
                { diarista: { nome: { contains: search, mode: 'insensitive' } } },
                { posto: { nome: { contains: search, mode: 'insensitive' } } },
                { observacao: { contains: search, mode: 'insensitive' } },
                { supervisor: { nome: { contains: search, mode: 'insensitive' } } }
            ]
        }

        const pendencias = await prisma.cobertura.findMany({
            where,
            include: {
                posto: true,
                diarista: true,
                motivo: true,
                meioPagamentoSolicitado: true,
                supervisor: { select: { nome: true } },
                aprovadorN1: { select: { nome: true } },
                aprovador: { select: { nome: true } },
                empresa: true
            },
            orderBy: { data: 'asc' }
        })

        const meios = await prisma.meioPagamento.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })

        return NextResponse.json({ items: pendencias, meios })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Execute Payment (Status -> PAGO) with File Upload
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN' && user.role !== 'APROVADOR_N2') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const formData = await req.formData()
        const id = formData.get("id") as string
        const acao = formData.get("acao") as string || 'PAGO' // Default to PAGO for backward compatibility
        const dataPagamento = formData.get("dataPagamento") as string
        const meioPagamentoId = formData.get("meioPagamentoId") as string
        const justificativa = formData.get("justificativa") as string
        const file = formData.get("comprovante") as File | null
        const pagarComAsaas = formData.get("pagarComAsaas") === "true"
        const confirmacaoSenha = formData.get("confirmacaoSenha") as string | null

        if (!id) {
            return new NextResponse("Missing id", { status: 400 })
        }

        if (acao === 'PAGO' && (!dataPagamento || !meioPagamentoId)) {
            return new NextResponse("Missing fields for payment", { status: 400 })
        }

        // Se for pagar com Asaas, exige senha e valida com o bcrypt
        if (acao === 'PAGO' && pagarComAsaas) {
            if (!confirmacaoSenha) {
                return new NextResponse(
                    JSON.stringify({ error: "Confirmação de senha obrigatória para pagamentos Asaas." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id }
            })
            if (!dbUser || !dbUser.password) {
                return new NextResponse(
                    JSON.stringify({ error: "Usuário não autorizado ou senha não cadastrada." }),
                    { status: 403, headers: { "Content-Type": "application/json" } }
                )
            }
            const isPasswordCorrect = confirmacaoSenha === dbUser.password
            if (!isPasswordCorrect) {
                return new NextResponse(
                    JSON.stringify({ error: "Assinatura Eletrônica incorreta. O pagamento Pix foi cancelado." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }
        }

        // Buscar dados da cobertura, diarista e antecipações para validação Asaas
        const cobertura = await prisma.cobertura.findUnique({
            where: { id },
            include: {
                diarista: true,
                posto: true,
                antecipacoes: true
            }
        })

        if (!cobertura) {
            return new NextResponse(
                JSON.stringify({ error: "Cobertura não encontrada." }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }

        // Verificar se existe solicitação de antecipação para aplicar o desconto da taxa de serviço (ex: R$ 0.50 ou 5%)
        const antecipacaoAtiva = cobertura.antecipacoes?.find(a => a.status === 'APROVADO' || a.status === 'PENDENTE' || a.status === 'PAGO')
        const taxaServico = antecipacaoAtiva ? Number(antecipacaoAtiva.taxaServico) : 0
        const valorOriginal = Number(cobertura.valor)
        const valorTransferenciaPix = antecipacaoAtiva ? Number(antecipacaoAtiva.valorSolicitado) : valorOriginal

        let asaasTransferId = ""
        let asaasReceiptUrl = ""
        if (acao === 'PAGO' && pagarComAsaas) {
            if (!cobertura.diarista.chavePix) {
                return new NextResponse(
                    JSON.stringify({ error: `O diarista ${cobertura.diarista.nome} não possui Chave Pix cadastrada.` }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }
            if (!cobertura.diarista.cpf) {
                return new NextResponse(
                    JSON.stringify({ error: `O diarista ${cobertura.diarista.nome} não possui CPF cadastrado.` }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            const descTaxa = taxaServico > 0 ? ` (Taxa Antecipação: -R$ ${taxaServico.toFixed(2)})` : ""

            const confirmarTitular = formData.get("confirmarDivergencia") === "true" || formData.get("confirmarTitular") === "true"
            if (!confirmarTitular) {
                const details = await getPixAddressKeyDetails(cobertura.diarista.chavePix)
                if (details.success && details.name) {
                    const nomesSimilares = areNamesSimilar(cobertura.diarista.nome, details.name)
                    if (!nomesSimilares) {
                        return new NextResponse(
                            JSON.stringify({
                                requerConfirmacaoTitular: true,
                                nomeCadastrado: cobertura.diarista.nome,
                                titularReal: details.name,
                                cpfCnpjTitular: details.cpfCnpj || "Não informado",
                                bancoTitular: details.bankName || "Banco de Destino",
                                chavePix: cobertura.diarista.chavePix
                            }),
                            { status: 200, headers: { "Content-Type": "application/json" } }
                        )
                    }
                }
            }

            // Envia o Pix pelo Asaas com o valor líquido (descontada a taxa de antecipação)
            const asaasResult = await sendPixTransfer({
                valor: valorTransferenciaPix,
                chavePix: cobertura.diarista.chavePix,
                cpf: cobertura.diarista.cpf,
                nome: cobertura.diarista.nome,
                descricao: `Pgto Cobertura: ${cobertura.posto.nome} - Ref. ${new Date(cobertura.data).toLocaleDateString('pt-BR')}${descTaxa}`
            })

            if (!asaasResult.success) {
                return new NextResponse(
                    JSON.stringify({ error: `Erro no Asaas: ${asaasResult.error}` }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }
            asaasTransferId = asaasResult.transferId || ""
            asaasReceiptUrl = asaasResult.transactionReceiptUrl || ""
        }

        // Handle File Upload if present
        let anexoData = undefined
        if (file && acao === 'PAGO') {
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)
            const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`

            anexoData = {
                create: {
                    url: base64Data,
                    nomeOriginal: file.name,
                    tamanho: file.size,
                    tipo: file.type,
                    usuarioId: user.id
                }
            }
        } else if (asaasReceiptUrl && acao === 'PAGO') {
            // Salva o comprovante oficial gerado pelo Asaas automaticamente como Anexo da Cobertura
            anexoData = {
                create: {
                    url: asaasReceiptUrl,
                    nomeOriginal: `Comprovante_Pix_Asaas_${id.slice(-6)}.pdf`,
                    tamanho: 1024,
                    tipo: "application/pdf",
                    usuarioId: user.id
                }
            }
        }

        let updateData: any = {}
        let historyParaStatus: any = 'PAGO'

        if (acao === 'PAGO') {
            const logAsaas = asaasTransferId ? ` [Asaas Pix ID: ${asaasTransferId}]` : ""
            updateData = {
                status: 'PAGO',
                dataPagamento: new Date(dataPagamento),
                meioPagamentoEfetivadoId: meioPagamentoId,
                justificativaPagamento: justificativa ? `${justificativa}${logAsaas}` : (logAsaas ? `Pagamento automático Asaas.${logAsaas}` : null),
                financeiroId: user.id,
                anexos: anexoData
            }
            historyParaStatus = 'PAGO'
        } else if (acao === 'REPROVAR') {
            updateData = {
                status: 'REPROVADO',
                justificativaReprovacao: `[FINANCEIRO] ${justificativa}`,
            }
            historyParaStatus = 'REPROVADO'
        } else if (acao === 'AJUSTE') {
            updateData = {
                status: 'AJUSTE',
                ajusteSolicitado: `[FINANCEIRO] ${justificativa}`,
            }
            historyParaStatus = 'AJUSTE'
        }

        await prisma.$transaction([
            prisma.cobertura.update({
                where: { id },
                data: updateData
            }),
            prisma.solicitacaoAntecipacao.updateMany({
                where: { coberturaId: id, status: { in: ["APROVADO", "PENDENTE"] } },
                data: { status: "PAGO", pagoEm: new Date() }
            }),
            prisma.historicoWorkflow.create({
                data: {
                    coberturaId: id,
                    deStatus: 'APROVADO',
                    paraStatus: historyParaStatus,
                    usuarioId: user.id,
                    observacao: `Ação: ${acao} (Financeiro). ${justificativa || ''}`
                }
            })
        ])

        // Only notify if it's not a standard payment (or if requested)
        // For REPROVADO and AJUSTE, it's essential to notify the supervisor
        const { notifyStatusChange } = require("@/lib/email")
        await notifyStatusChange(id, historyParaStatus, justificativa)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
