import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runExpenseAudit } from "@/lib/audit"
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get("tipo") // REEMBOLSO ou ADIANTAMENTO
    const status = searchParams.get("status")

    try {
        const isAdminOrFinance = ['ADMIN', 'FINANCEIRO', 'APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2'].includes(user.role)
        
        const filter: any = isAdminOrFinance ? {} : { solicitanteId: user.id }
        
        if (tipo) filter.tipo = tipo
        if (status) filter.status = status

        const despesas = await prisma.despesa.findMany({
            where: filter,
            include: {
                solicitante: {
                    select: { id: true, nome: true, email: true, role: true }
                },
                aprovador: {
                    select: { id: true, nome: true, email: true }
                },
                financeiro: {
                    select: { id: true, nome: true, email: true }
                },
                anexos: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(despesas)
    } catch (error) {
        console.error("Erro ao buscar despesas:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Criar uma nova despesa (Reembolso ou Adiantamento)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any

    try {
        const body = await req.json()
        const { tipo, descricao, valorSolicitado, anexos, enviarParaAprovacao } = body

        if (!tipo || !descricao || !valorSolicitado) {
            return new NextResponse(
                JSON.stringify({ error: "Campos obrigatórios: tipo, descricao, valorSolicitado." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        if (tipo !== 'REEMBOLSO' && tipo !== 'ADIANTAMENTO') {
            return new NextResponse(
                JSON.stringify({ error: "Tipo inválido. Deve ser REEMBOLSO ou ADIANTAMENTO." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const valor = parseFloat(valorSolicitado)
        if (isNaN(valor) || valor <= 0) {
            return new NextResponse(
                JSON.stringify({ error: "Valor solicitado inválido. Deve ser maior que 0." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Rodar auditoria de políticas e termos proibidos
        const auditResult = await runExpenseAudit(descricao, valor, anexos || [])

        // Define status inicial: RASCUNHO ou AGUARDANDO_APROVACAO
        const statusInicial = enviarParaAprovacao ? 'AGUARDANDO_APROVACAO' : 'RASCUNHO'

        const despesa = await prisma.$transaction(async (tx) => {
            const novaDespesa = await tx.despesa.create({
                data: {
                    tipo,
                    status: statusInicial,
                    descricao,
                    valorSolicitado: valor,
                    solicitanteId: user.id,
                    alertaAuditoria: auditResult.alertMessage
                }
            })

            // Registrar histórico inicial
            await tx.historicoDespesa.create({
                data: {
                    despesaId: novaDespesa.id,
                    paraStatus: statusInicial,
                    usuarioId: user.id,
                    observacao: enviarParaAprovacao 
                        ? "Despesa criada e enviada diretamente para aprovação." 
                        : "Despesa salva em rascunho."
                }
            })

            // Se existirem anexos iniciais (ex: comprovantes de reembolso)
            if (anexos && Array.isArray(anexos) && anexos.length > 0) {
                for (const anexo of anexos) {
                    await tx.anexo.create({
                        data: {
                            url: anexo.url,
                            nomeOriginal: anexo.nomeOriginal,
                            tamanho: anexo.tamanho,
                            tipo: anexo.tipo,
                            usuarioId: user.id,
                            despesaId: novaDespesa.id
                        }
                    })
                }
            }

            return novaDespesa
        })

        return NextResponse.json(despesa)
    } catch (error) {
        console.error("Erro ao criar despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
