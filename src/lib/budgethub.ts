import { PrismaClient } from '@prisma/client'
import { prisma as mainDb } from './prisma'

// Instância dedicada para conectar ao Neon do BudgetHub
const budgetHubDbUrl =
    process.env.BUDGETHUB_DATABASE_URL ||
    "postgresql://neondb_owner:npg_SAEpJxyumo01@ep-muddy-lake-ah0t8360-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

const globalForBudgetHub = globalThis as unknown as { budgetHubPrisma: PrismaClient }

export const budgetHubPrisma =
    globalForBudgetHub.budgetHubPrisma ||
    new PrismaClient({
        datasources: {
            db: {
                url: budgetHubDbUrl
            }
        }
    })

if (process.env.NODE_ENV !== 'production') {
    globalForBudgetHub.budgetHubPrisma = budgetHubPrisma
}

export interface BudgetHubTenant {
    id: string
    name: string
    cnpj: string
}

export interface BudgetHubCostCenter {
    id: string
    name: string
    tenantId: string
}

export interface BudgetHubCategory {
    id: string
    name: string
    tenantId: string
    type: string
    isMateriais036: boolean
    isEpiUniforme035: boolean
    grupo: string
}

export interface BudgetAvailability {
    orcado: number
    realizado: number
    comprometidoPedidos: number
    saldoDisponivel: number
    isNegative: boolean
    mes: number
    ano: number
}

/**
 * Retorna as empresas (Tenants) cadastradas no BudgetHub
 */
export async function getBudgetHubTenants(): Promise<BudgetHubTenant[]> {
    try {
        const tenants = await budgetHubPrisma.$queryRaw<BudgetHubTenant[]>`
            SELECT id, name, cnpj 
            FROM "Tenant" 
            ORDER BY name ASC
        `
        return tenants
    } catch (error) {
        console.error("Erro ao buscar tenants do BudgetHub:", error)
        return [
            { id: "413f88a7-ce4a-4620-b044-43ef909b7b26", name: "SPOT FACILITIES", cnpj: "00000000000000" },
            { id: "dc2b6eed-a38a-43c3-9465-ce854bfda90f", name: "JVS FACILITIES", cnpj: "unknown-1772022903153" },
            { id: "0013c839-93bb-472d-ba64-092c89e1cacf", name: "JVS TRATMENTOS", cnpj: "unknown-1771882599196" },
            { id: "1fa165e3-178f-4d8f-ae7c-434c720c82dd", name: "CLEAN TECH", cnpj: "unknown-1771882888596" }
        ]
    }
}

/**
 * Retorna os Centros de Custo de uma determinada Empresa (ou todos se não informado)
 */
export async function getBudgetHubCostCenters(tenantId?: string): Promise<BudgetHubCostCenter[]> {
    try {
        if (tenantId) {
            return await budgetHubPrisma.$queryRaw<BudgetHubCostCenter[]>`
                SELECT id, name, "tenantId" 
                FROM "CostCenter" 
                WHERE "tenantId" = ${tenantId}
                ORDER BY name ASC
            `
        }
        return await budgetHubPrisma.$queryRaw<BudgetHubCostCenter[]>`
            SELECT id, name, "tenantId" 
            FROM "CostCenter" 
            ORDER BY name ASC
        `
    } catch (error) {
        console.error("Erro ao buscar centros de custo do BudgetHub:", error)
        return []
    }
}

/**
 * Retorna as categorias de despesas do BudgetHub, com destaque para 03.6 Materiais e 03.5 EPI/Uniforme
 */
export async function getBudgetHubCategories(tenantId?: string): Promise<BudgetHubCategory[]> {
    try {
        let rawCats: any[] = []
        if (tenantId) {
            rawCats = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT id, name, "tenantId", type 
                FROM "Category" 
                WHERE "tenantId" = ${tenantId} AND (type = 'DESPESA' OR type = 'EXPENSE')
                ORDER BY name ASC
            `
        } else {
            rawCats = await budgetHubPrisma.$queryRaw<any[]>`
                SELECT DISTINCT id, name, "tenantId", type 
                FROM "Category" 
                WHERE (type = 'DESPESA' OR type = 'EXPENSE')
                ORDER BY name ASC
            `
        }

        return rawCats.map((cat) => {
            const isMateriais036 = cat.name.includes("03.6") || cat.name.toLowerCase().includes("materiais")
            const isEpiUniforme035 = cat.name.includes("03.5") || cat.name.toLowerCase().includes("epi") || cat.name.toLowerCase().includes("uniforme")

            const match = cat.name.match(/^(\d{2}\.\d+)/)
            const grupo = match ? match[1] : "Outras Contas"

            return {
                id: cat.id,
                name: cat.name.trim(),
                tenantId: cat.tenantId,
                type: cat.type,
                isMateriais036,
                isEpiUniforme035,
                grupo
            }
        })
    } catch (error) {
        console.error("Erro ao buscar categorias do BudgetHub:", error)
        return []
    }
}

/**
 * Consulta o Saldo de Budget disponível para uma combinação de Empresa, Centro de Custo, Categoria, Mês e Ano
 */
export async function getBudgetAvailability(params: {
    tenantId: string
    costCenterId: string
    categoryId: string
    mes: number
    ano: number
}): Promise<BudgetAvailability> {
    const { tenantId, costCenterId, categoryId, mes, ano } = params

    try {
        // 1. Buscar valor orçado no BudgetHub
        const costCenterSuffix = costCenterId.includes(':') ? costCenterId.split(':').pop()! : costCenterId
        const budgets = await budgetHubPrisma.$queryRaw<any[]>`
            SELECT amount 
            FROM "BudgetEntry" 
            WHERE "tenantId" = ${tenantId}
              AND "categoryId" = ${categoryId}
              AND ("costCenterId" = ${costCenterId} OR "costCenterId" LIKE ${'%' + costCenterSuffix})
              AND month = ${mes}
              AND year = ${ano}
            LIMIT 1
        `
        const orcado = budgets.length > 0 && budgets[0].amount ? Number(budgets[0].amount) : 0

        // 2. Buscar valor já realizado no BudgetHub
        const realized = await budgetHubPrisma.$queryRaw<any[]>`
            SELECT COALESCE(SUM(amount), 0) as total_realized
            FROM "RealizedEntry"
            WHERE "tenantId" = ${tenantId}
              AND "categoryId" = ${categoryId}
              AND ("costCenterId" = ${costCenterId} OR "costCenterId" LIKE ${'%' + costCenterSuffix})
              AND month = ${mes}
              AND year = ${ano}
        `
        const realizado = realized.length > 0 && realized[0].total_realized ? Number(realized[0].total_realized) : 0

        // 3. Buscar pedidos de compra no ReembolsaFácil para a mesma chave
        const pedidos = await mainDb.pedidoCompra.findMany({
            where: {
                tenantId,
                centroCustoId: costCenterId,
                categoriaId: categoryId,
                mesCompetencia: mes,
                anoCompetencia: ano,
                status: {
                    in: ['APROVADO', 'AGUARDANDO_APROVACAO', 'COTADO', 'CONCLUIDO']
                }
            },
            select: {
                valorTotalCotado: true,
                valorTotalEstimado: true
            }
        })

        const comprometidoPedidos = pedidos.reduce((acc, p) => {
            const val = p.valorTotalCotado ? Number(p.valorTotalCotado) : (p.valorTotalEstimado ? Number(p.valorTotalEstimado) : 0)
            return acc + val
        }, 0)

        const saldoDisponivel = orcado - realizado - comprometidoPedidos

        return {
            orcado,
            realizado,
            comprometidoPedidos,
            saldoDisponivel,
            isNegative: saldoDisponivel < 0,
            mes,
            ano
        }
    } catch (error) {
        console.error("Erro ao calcular disponibilidade de budget:", error)
        return {
            orcado: 0,
            realizado: 0,
            comprometidoPedidos: 0,
            saldoDisponivel: 0,
            isNegative: false,
            mes,
            ano
        }
    }
}
