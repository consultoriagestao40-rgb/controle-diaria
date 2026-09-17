import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { budgetHubPrisma, CONTA_PAI_MAP } from "@/lib/budgethub"
import { prisma as mainDb } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId") || ""
    const costCenterId = searchParams.get("costCenterId") || ""
    const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1), 10)
    const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()), 10)
    const contaPai = searchParams.get("contaPai") || ""
    const search = searchParams.get("search")?.trim().toLowerCase() || ""

    try {
        const cleanCc = costCenterId.includes(":") ? costCenterId.split(":").pop()! : costCenterId

        // 1. Buscar entradas de Orçado no BudgetHub
        let budgetsRaw: any[] = []
        if (tenantId && cleanCc) {
            budgetsRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT b."categoryId", c.name as category_name, c.type, SUM(b.amount) as orcado
                FROM "BudgetEntry" b
                JOIN "Category" c ON b."categoryId" = c.id
                WHERE b."tenantId" = ${tenantId}
                  AND (b."costCenterId" = ${costCenterId} OR b."costCenterId" = ${cleanCc} OR b."costCenterId" LIKE ${'%' + cleanCc})
                  AND b.month = ${mes}
                  AND b.year = ${ano}
                GROUP BY b."categoryId", c.name, c.type
            `
        } else if (tenantId) {
            budgetsRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT b."categoryId", c.name as category_name, c.type, SUM(b.amount) as orcado
                FROM "BudgetEntry" b
                JOIN "Category" c ON b."categoryId" = c.id
                WHERE b."tenantId" = ${tenantId}
                  AND b.month = ${mes}
                  AND b.year = ${ano}
                GROUP BY b."categoryId", c.name, c.type
            `
        } else if (cleanCc) {
            budgetsRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT b."categoryId", c.name as category_name, c.type, SUM(b.amount) as orcado
                FROM "BudgetEntry" b
                JOIN "Category" c ON b."categoryId" = c.id
                WHERE (b."costCenterId" = ${costCenterId} OR b."costCenterId" = ${cleanCc} OR b."costCenterId" LIKE ${'%' + cleanCc})
                  AND b.month = ${mes}
                  AND b.year = ${ano}
                GROUP BY b."categoryId", c.name, c.type
            `
        } else {
            budgetsRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT b."categoryId", c.name as category_name, c.type, SUM(b.amount) as orcado
                FROM "BudgetEntry" b
                JOIN "Category" c ON b."categoryId" = c.id
                WHERE b.month = ${mes}
                  AND b.year = ${ano}
                GROUP BY b."categoryId", c.name, c.type
            `
        }

        // 2. Buscar entradas de Realizado (financeiro) no BudgetHub
        let realizedRaw: any[] = []
        if (tenantId && cleanCc) {
            realizedRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT r."categoryId", SUM(r.amount) as realizado
                FROM "RealizedEntry" r
                WHERE r."tenantId" = ${tenantId}
                  AND (r."costCenterId" = ${costCenterId} OR r."costCenterId" = ${cleanCc} OR r."costCenterId" LIKE ${'%' + cleanCc})
                  AND r.month = ${mes}
                  AND r.year = ${ano}
                GROUP BY r."categoryId"
            `
        } else if (tenantId) {
            realizedRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT r."categoryId", SUM(r.amount) as realizado
                FROM "RealizedEntry" r
                WHERE r."tenantId" = ${tenantId}
                  AND r.month = ${mes}
                  AND r.year = ${ano}
                GROUP BY r."categoryId"
            `
        } else if (cleanCc) {
            realizedRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT r."categoryId", SUM(r.amount) as realizado
                FROM "RealizedEntry" r
                WHERE (r."costCenterId" = ${costCenterId} OR r."costCenterId" = ${cleanCc} OR r."costCenterId" LIKE ${'%' + cleanCc})
                  AND r.month = ${mes}
                  AND r.year = ${ano}
                GROUP BY r."categoryId"
            `
        } else {
            realizedRaw = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT r."categoryId", SUM(r.amount) as realizado
                FROM "RealizedEntry" r
                WHERE r.month = ${mes}
                  AND r.year = ${ano}
                GROUP BY r."categoryId"
            `
        }

        // Mapa de Realizados do BudgetHub por categoryId
        const realizedMap: Record<string, number> = {}
        for (const r of realizedRaw) {
            realizedMap[r.categoryId] = Number(r.realizado) || 0
        }

        // 3. Buscar Pedidos de Compra emitidos no ReembolsaFácil para a competência
        const wherePedidos: any = {
            mesCompetencia: mes,
            anoCompetencia: ano,
            status: { in: ["APROVADO", "AGUARDANDO_APROVACAO", "COTADO", "CONCLUIDO"] }
        }
        if (tenantId) wherePedidos.tenantId = tenantId
        if (costCenterId) wherePedidos.centroCustoId = costCenterId

        const pedidos = await mainDb.pedidoCompra.findMany({
            where: wherePedidos,
            select: {
                id: true,
                numeroPedido: true,
                categoriaId: true,
                categoriaNome: true,
                centroCustoNome: true,
                tenantNome: true,
                valorTotalCotado: true,
                valorTotalEstimado: true,
                status: true
            }
        })

        // Agrupar pedidos por categoriaId e categoriaNome
        const pedidosMap: Record<string, { total: number; count: number; pedidos: any[] }> = {}
        for (const p of pedidos) {
            const key = p.categoriaId || p.categoriaNome
            if (!pedidosMap[key]) {
                pedidosMap[key] = { total: 0, count: 0, pedidos: [] }
            }
            const valor = Number(p.valorTotalCotado) || Number(p.valorTotalEstimado) || 0
            pedidosMap[key].total += valor
            pedidosMap[key].count += 1
            pedidosMap[key].pedidos.push(p)
        }

        // 4. Consolidar todas as categorias em uma lista unificada
        const categoriesMap: Record<string, any> = {}

        // Inserir categorias do BudgetHub
        for (const b of budgetsRaw) {
            const catId = b.categoryId
            const catName = (b.category_name || "Sem Descrição").trim()
            const orcado = Number(b.orcado) || 0
            const realizadoFin = realizedMap[catId] || 0

            // Match de pedidos por ID ou nome
            const pedidosInfo = pedidosMap[catId] || pedidosMap[catName] || { total: 0, count: 0, pedidos: [] }

            const matchCode = catName.match(/^(\d{2}\.\d+)/)
            const code = matchCode ? matchCode[1] : "OUTROS"
            const contaPaiNome = CONTA_PAI_MAP[code] || `${code} - Outras Despesas`

            categoriesMap[catId] = {
                categoriaId: catId,
                categoriaNome: catName,
                codigo: code,
                contaPai: contaPaiNome,
                valorOrcado: orcado,
                valorRealizadoFinanceiro: realizadoFin,
                valorPedidosCompras: pedidosInfo.total,
                pedidosCount: pedidosInfo.count,
                pedidos: pedidosInfo.pedidos
            }
        }

        // Inserir categorias que tenham pedidos mas que porventura não tenham registro em BudgetEntry
        for (const [key, pInfo] of Object.entries(pedidosMap)) {
            if (!categoriesMap[key]) {
                const sample = pInfo.pedidos[0]
                const catName = sample?.categoriaNome || key
                const matchCode = catName.match(/^(\d{2}\.\d+)/)
                const code = matchCode ? matchCode[1] : "OUTROS"
                const contaPaiNome = CONTA_PAI_MAP[code] || `${code} - Outras Despesas`

                categoriesMap[key] = {
                    categoriaId: key,
                    categoriaNome: catName,
                    codigo: code,
                    contaPai: contaPaiNome,
                    valorOrcado: 0,
                    valorRealizadoFinanceiro: 0,
                    valorPedidosCompras: pInfo.total,
                    pedidosCount: pInfo.count,
                    pedidos: pInfo.pedidos
                }
            }
        }

        // 5. Formatar linhas, calcular saldo, saving e estouro
        let linhas = Object.values(categoriesMap).map((cat) => {
            const orcado = cat.valorOrcado
            const pedidosVal = cat.valorPedidosCompras
            const realizadoFin = cat.valorRealizadoFinanceiro
            const totalComprometido = pedidosVal + realizadoFin
            const saldoDisponivel = orcado - totalComprometido

            const saving = saldoDisponivel > 0 ? saldoDisponivel : 0
            const valorEstourado = saldoDisponivel < 0 ? Math.abs(saldoDisponivel) : 0
            const percentualConsumido = orcado > 0 ? (totalComprometido / orcado) * 100 : totalComprometido > 0 ? 100 : 0

            let status: "OK" | "ATENCAO" | "ESTOURADO" = "OK"
            if (percentualConsumido > 100 || saldoDisponivel < 0) {
                status = "ESTOURADO"
            } else if (percentualConsumido >= 80) {
                status = "ATENCAO"
            }

            return {
                ...cat,
                totalComprometido,
                saldoDisponivel,
                saving,
                valorEstourado,
                percentualConsumido,
                status
            }
        })

        // 6. Aplicar filtros opcionais de Conta Pai ou Busca
        if (contaPai && contaPai !== "all") {
            linhas = linhas.filter((l) => l.codigo.startsWith(contaPai) || l.contaPai.includes(contaPai))
        }

        if (search) {
            linhas = linhas.filter(
                (l) =>
                    l.categoriaNome.toLowerCase().includes(search) ||
                    l.contaPai.toLowerCase().includes(search)
            )
        }

        // Ordenar por código da conta
        linhas.sort((a, b) => a.categoriaNome.localeCompare(b.categoriaNome))

        // 7. Calcular Totais Gerais do Período
        const totais = linhas.reduce(
            (acc, l) => {
                acc.valorOrcado += l.valorOrcado
                acc.valorRealizadoFinanceiro += l.valorRealizadoFinanceiro
                acc.valorPedidosCompras += l.valorPedidosCompras
                acc.totalComprometido += l.totalComprometido
                acc.saldoDisponivel += l.saldoDisponivel
                acc.saving += l.saving
                acc.valorEstourado += l.valorEstourado
                acc.pedidosCount += l.pedidosCount
                return acc
            },
            {
                valorOrcado: 0,
                valorRealizadoFinanceiro: 0,
                valorPedidosCompras: 0,
                totalComprometido: 0,
                saldoDisponivel: 0,
                saving: 0,
                valorEstourado: 0,
                pedidosCount: 0
            }
        )

        const percentualGeral =
            totais.valorOrcado > 0 ? (totais.totalComprometido / totais.valorOrcado) * 100 : 0

        return NextResponse.json({
            mes,
            ano,
            tenantId,
            costCenterId,
            linhas,
            totais: {
                ...totais,
                percentualGeral
            }
        })
    } catch (err: any) {
        console.error("Erro ao gerar relatório mensal de orçado x realizado:", err)
        return NextResponse.json({ error: err.message || "Falha ao gerar relatório" }, { status: 500 })
    }
}
