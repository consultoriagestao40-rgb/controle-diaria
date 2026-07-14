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
    const scope = searchParams.get("scope")

    try {
        const isAdminOrFinance = ['ADMIN', 'FINANCEIRO', 'APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2'].includes(user.role)
        
        const filter: any = (isAdminOrFinance && scope !== 'proprias') ? {} : { solicitanteId: user.id }
        
        if (tipo) filter.tipo = tipo
        if (status) {
            if (status === 'AGUARDANDO_APROVACAO') {
                filter.status = {
                    in: ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2']
                }
            } else {
                filter.status = status
            }
        }

        let despesas = await prisma.despesa.findMany({
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
                centroCusto: true,
                anexos: true,
                itens: true
            },
            orderBy: { createdAt: 'desc' }
        })

        // Roteamento Dinâmico de Exibição com base no Aprovador N1 / N2 do Centro de Custo
        if (user.role !== 'ADMIN') {
            const isApproverRole = ['APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2'].includes(user.role)
            if (isApproverRole) {
                despesas = despesas.filter(d => {
                    if (d.status === 'AGUARDANDO_APROVACAO') return true
                    
                    if (d.status === 'AGUARDANDO_APROVACAO_N1') {
                        return d.centroCusto?.aprovadorN1Id === user.id
                    }
                    
                    if (d.status === 'AGUARDANDO_APROVACAO_N2') {
                        if (user.role === 'APROVADOR_N2') return true
                        return d.centroCusto?.aprovadorN2Id === user.id
                    }
                    
                    return true
                })
            }

            if (user.role === 'FINANCEIRO') {
                despesas = despesas.filter(d => {
                    const isFinancePhase = ['APROVADO', 'AGUARDANDO_CONCILIACAO', 'AGUARDANDO_PRESTACAO'].includes(d.status)
                    if (isFinancePhase) {
                        if (d.centroCusto?.financeiroId) {
                            return d.centroCusto.financeiroId === user.id
                        }
                    }
                    return true
                })
            }
        }

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
        const { tipo, descricao, valorSolicitado, anexos, enviarParaAprovacao, itens } = body
 
        if (!tipo || !descricao) {
            return new NextResponse(
                JSON.stringify({ error: "Campos obrigatórios: tipo, descricao." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
 
        if (tipo !== 'REEMBOLSO' && tipo !== 'ADIANTAMENTO') {
            return new NextResponse(
                JSON.stringify({ error: "Tipo inválido. Deve ser REEMBOLSO ou ADIANTAMENTO." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Processar itens detalhados (Itemização)
        let itemsToCreate: any[] = []
        let totalCalculado = 0

        if (itens && Array.isArray(itens) && itens.length > 0) {
            for (const item of itens) {
                const { categoria, descricao: itemDesc, data, quantidade, valorUnitario } = item
                if (!categoria || !itemDesc || !data || !quantidade || !valorUnitario) {
                    return new NextResponse(
                        JSON.stringify({ error: "Todos os itens devem conter: categoria, descrição, data, quantidade e valor unitário." }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    )
                }

                const qty = parseInt(quantidade)
                const valUnit = Math.round(parseFloat(valorUnitario) * 100) / 100

                if (isNaN(qty) || qty <= 0 || isNaN(valUnit) || valUnit <= 0) {
                    return new NextResponse(
                        JSON.stringify({ error: "Quantidade e valor unitário devem ser maiores que zero." }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    )
                }

                const valTotal = Math.round(qty * valUnit * 100) / 100
                totalCalculado = Math.round((totalCalculado + valTotal) * 100) / 100

                itemsToCreate.push({
                    categoria: categoria.toUpperCase().trim(),
                    descricao: itemDesc,
                    data: new Date(data),
                    quantidade: qty,
                    valorUnitario: valUnit,
                    valorTotal: valTotal
                })
            }
        }

        const valor = itemsToCreate.length > 0 ? totalCalculado : Math.round(parseFloat(valorSolicitado) * 100) / 100
        
        if (isNaN(valor) || valor <= 0) {
            return new NextResponse(
                JSON.stringify({ error: "Valor total inválido. Deve ser maior que 0." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
 
        // Rodar auditoria de políticas e termos proibidos (incluindo itens)
        const auditResult = await runExpenseAudit(descricao, valor, anexos || [], itemsToCreate)
 
        // Buscar o centro de custo do usuário solicitante para roteamento e registro
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                centroCusto: true
            }
        })
        const userCentroCustoId = dbUser?.centroCustoId || null
        const hasN1 = dbUser?.centroCusto?.aprovadorN1Id ? true : false
        const hasN2 = dbUser?.centroCusto?.aprovadorN2Id ? true : false

        // Define status inicial: adiantamentos e reembolsos sempre passam por aprovação de níveis (N1/N2)
        let statusInicial: any = 'RASCUNHO'
        if (enviarParaAprovacao) {
            if (hasN1) {
                statusInicial = 'AGUARDANDO_APROVACAO_N1'
            } else {
                statusInicial = 'AGUARDANDO_APROVACAO_N2'
            }
        }
 
        const despesa = await prisma.$transaction(async (tx) => {
            const novaDespesa = await tx.despesa.create({
                data: {
                    tipo,
                    status: statusInicial,
                    descricao,
                    valorSolicitado: valor,
                    solicitanteId: user.id,
                    centroCustoId: userCentroCustoId,
                    alertaAuditoria: auditResult.alertMessage,
                    itens: itemsToCreate.length > 0 ? {
                        create: itemsToCreate.map(item => ({
                            categoria: item.categoria,
                            descricao: item.descricao,
                            data: item.data,
                            quantidade: item.quantidade,
                            valorUnitario: item.valorUnitario,
                            valorTotal: item.valorTotal
                        }))
                    } : undefined
                }
            })
 
            // Registrar histórico inicial
            await tx.historicoDespesa.create({
                data: {
                    despesaId: novaDespesa.id,
                    paraStatus: statusInicial,
                    usuarioId: user.id,
                    observacao: enviarParaAprovacao 
                        ? (statusInicial === 'APROVADO' 
                            ? "Despesa criada e aprovada automaticamente por estar dentro da política e encaminhada ao financeiro." 
                            : (tipo === 'ADIANTAMENTO' 
                                ? "Adiantamento criado e enviado para aprovação superior do gestor."
                                : "Reembolso criado e enviado para aprovação do gestor por violar políticas.")) 
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
