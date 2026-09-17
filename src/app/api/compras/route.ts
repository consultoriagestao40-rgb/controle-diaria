import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBudgetAvailability, budgetHubPrisma } from "@/lib/budgethub"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const tenantId = searchParams.get("tenantId")
    const scope = searchParams.get("scope") // 'minhas' | 'todas' | 'aprovacoes' | 'cotacoes'
    const search = searchParams.get("search")

    try {
        const isBuyerOrAdmin = ['ADMIN', 'COMPRADOR', 'FINANCEIRO', 'APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2'].includes(user.role)

        const filter: any = {}

        if (scope === 'minhas' || (!isBuyerOrAdmin && scope !== 'todas')) {
            filter.solicitanteId = user.id
        }

        if (status) {
            filter.status = status
        }

        if (tenantId) {
            filter.tenantId = tenantId
        }

        if (search) {
            filter.OR = [
                { numeroPedido: { contains: search, mode: 'insensitive' } },
                { justificativa: { contains: search, mode: 'insensitive' } },
                { fornecedorNome: { contains: search, mode: 'insensitive' } },
                { centroCustoNome: { contains: search, mode: 'insensitive' } },
                { categoriaNome: { contains: search, mode: 'insensitive' } }
            ]
        }

        const pedidos = await prisma.pedidoCompra.findMany({
            where: filter,
            include: {
                solicitante: {
                    select: { id: true, nome: true, email: true, role: true }
                },
                comprador: {
                    select: { id: true, nome: true, email: true }
                },
                aprovador: {
                    select: { id: true, nome: true, email: true }
                },
                itens: true,
                historico: {
                    orderBy: { data: 'desc' },
                    take: 5
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Enriquecer cada pedido com o valor orçado mensal e o saving / estouro
        const enrichedPedidos = await Promise.all(
            pedidos.map(async (p) => {
                let orcado = 0
                try {
                    const cleanCat = p.categoriaId.includes(":") ? p.categoriaId.split(":").pop()! : p.categoriaId
                    const cleanCc = p.centroCustoId.includes(":") ? p.centroCustoId.split(":").pop()! : p.centroCustoId

                    const b = await budgetHubPrisma.$queryRaw<any[]>`
                        SELECT amount 
                        FROM "BudgetEntry" 
                        WHERE "tenantId" = ${p.tenantId}
                          AND ("categoryId" = ${p.categoriaId} OR "categoryId" = ${cleanCat} OR "categoryId" LIKE ${'%' + cleanCat})
                          AND ("costCenterId" = ${p.centroCustoId} OR "costCenterId" = ${cleanCc} OR "costCenterId" LIKE ${'%' + cleanCc})
                          AND month = ${p.mesCompetencia}
                          AND year = ${p.anoCompetencia}
                        LIMIT 1
                    `
                    if (b.length > 0 && b[0].amount) {
                        orcado = Number(b[0].amount)
                    } else if (p.budgetDisponivel) {
                        orcado = Number(p.budgetDisponivel)
                    }
                } catch (e) {
                    if (p.budgetDisponivel) orcado = Number(p.budgetDisponivel)
                }

                const valorCotado = Number(p.valorTotalCotado) || Number(p.valorTotalEstimado) || 0
                const saving = orcado > valorCotado ? orcado - valorCotado : 0
                const valorEstourado = valorCotado > orcado && orcado > 0 ? valorCotado - orcado : 0
                const isEstourado = valorCotado > orcado && orcado > 0

                return {
                    ...p,
                    valorOrcado: orcado,
                    saving,
                    valorEstourado,
                    isEstourado
                }
            })
        )

        return NextResponse.json(enrichedPedidos)
    } catch (error: any) {
        console.error("Erro ao listar pedidos de compra:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any

    try {
        const body = await req.json()
        const {
            tenantId,
            tenantNome,
            centroCustoId,
            centroCustoNome,
            categoriaId,
            categoriaNome,
            mesCompetencia,
            anoCompetencia,
            tipoCompra,
            justificativa,
            itens
        } = body

        if (!tenantId || !centroCustoId || !categoriaId || !mesCompetencia || !anoCompetencia || !justificativa) {
            return NextResponse.json(
                { error: "Campos obrigatórios ausentes: Empresa, Centro de Custo, Categoria, Competência e Justificativa." },
                { status: 400 }
            )
        }

        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            return NextResponse.json(
                { error: "O pedido deve conter pelo menos um item para compra." },
                { status: 400 }
            )
        }

        // Consultar snapshot de saldo de budget disponível no momento
        let budgetDisponivel = 0
        try {
            const avail = await getBudgetAvailability({
                tenantId,
                costCenterId: centroCustoId,
                categoryId: categoriaId,
                mes: Number(mesCompetencia),
                ano: Number(anoCompetencia)
            })
            budgetDisponivel = avail.saldoDisponivel
        } catch (e) {
            console.warn("Aviso: Falha ao consultar budget inicial no BudgetHub", e)
        }

        // Gerar número sequencial do pedido PC-YYYY-XXXX
        const anoAtual = new Date().getFullYear()
        const totalExistentes = await prisma.pedidoCompra.count({
            where: {
                numeroPedido: {
                    startsWith: `PC-${anoAtual}`
                }
            }
        })
        const sequencial = String(totalExistentes + 1).padStart(4, '0')
        const numeroPedido = `PC-${anoAtual}-${sequencial}`

        // Criar o pedido e os itens
        const novoPedido = await prisma.pedidoCompra.create({
            data: {
                numeroPedido,
                status: 'AGUARDANDO_COTACAO',
                tipoCompra: tipoCompra || 'OUTROS',
                tenantId,
                tenantNome: tenantNome || 'EMPRESA',
                centroCustoId,
                centroCustoNome: centroCustoNome || 'CENTRO DE CUSTO',
                categoriaId,
                categoriaNome: categoriaNome || 'CATEGORIA',
                mesCompetencia: Number(mesCompetencia),
                anoCompetencia: Number(anoCompetencia),
                budgetDisponivel,
                justificativa,
                solicitanteId: user.id,
                itens: {
                    create: itens.map((item: any) => ({
                        descricao: item.descricao,
                        especificacao: item.especificacao || null,
                        quantidade: Number(item.quantidade) || 1,
                        unidade: item.unidade || 'UN'
                    }))
                },
                historico: {
                    create: {
                        paraStatus: 'AGUARDANDO_COTACAO',
                        usuarioId: user.id,
                        observacao: `Pedido criado pelo solicitante ${user.name || user.email} e enviado para cotação de suprimentos.`
                    }
                }
            },
            include: {
                itens: true,
                solicitante: {
                    select: { id: true, nome: true, email: true }
                }
            }
        })

        return NextResponse.json(novoPedido, { status: 201 })
    } catch (error: any) {
        console.error("Erro ao criar pedido de compra:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
