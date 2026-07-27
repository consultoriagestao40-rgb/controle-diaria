import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any

    try {
        const { searchParams } = new URL(request.url)
        const filterDiaristaId = searchParams.get("diaristaId")
        const filterReservaId = searchParams.get("reservaId")
        const filterMotivoId = searchParams.get("motivoId")
        const filterPostoId = searchParams.get("postoId")
        const filterSupervisorId = searchParams.get("supervisorId")

        const now = new Date()
        const currentYear = now.getFullYear()
        const startOfYear = new Date(currentYear, 0, 1)
        const startOfMonth = new Date(currentYear, now.getMonth(), 1)
        
        // --- 1. SEÇÃO DE REEMBOLSOS & DESPESAS ---
        const minhasDespesasResult = await prisma.despesa.aggregate({
            _sum: { valorSolicitado: true },
            where: { solicitanteId: user.id }
        })
        const totalMinhasDespesas = Number(minhasDespesasResult._sum.valorSolicitado || 0)

        const pendenteDescontoResult = await prisma.despesa.aggregate({
            _sum: { saldoFinal: true },
            where: {
                solicitanteId: user.id,
                tipo: 'ADIANTAMENTO',
                status: { in: ['AGUARDANDO_PRESTACAO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2'] },
                saldoFinal: { gt: 0 }
            }
        })
        const totalPendenteDesconto = Number(pendenteDescontoResult._sum.saldoFinal || 0)

        const pendentePrestacaoResult = await prisma.despesa.aggregate({
            _sum: { valorSolicitado: true },
            where: {
                solicitanteId: user.id,
                tipo: 'ADIANTAMENTO',
                status: 'AGUARDANDO_PRESTACAO',
                valorComprovado: null
            }
        })
        const totalPendentePrestacao = Number(pendentePrestacaoResult._sum.valorSolicitado || 0)

        const despesaMensalResult = await prisma.despesa.aggregate({
            _sum: { valorSolicitado: true },
            where: {
                solicitanteId: user.id,
                createdAt: { gte: startOfMonth }
            }
        })
        const totalDespesaMensal = Number(despesaMensalResult._sum.valorSolicitado || 0)

        // Histórico Mensal de Despesas (Últimos 6 meses)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
        sixMonthsAgo.setDate(1)
        sixMonthsAgo.setHours(0, 0, 0, 0)

        const despesasRecent = await prisma.despesa.findMany({
            where: {
                solicitanteId: user.id,
                createdAt: { gte: sixMonthsAgo }
            },
            select: { valorSolicitado: true, createdAt: true }
        })

        const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const monthlyDespesasMap: { [key: string]: number } = {}

        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(now.getMonth() - i)
            const label = `${monthsShort[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`
            monthlyDespesasMap[label] = 0
        }

        for (const d of despesasRecent) {
            const date = new Date(d.createdAt)
            const label = `${monthsShort[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`
            if (monthlyDespesasMap[label] !== undefined) {
                monthlyDespesasMap[label] += Number(d.valorSolicitado)
            }
        }

        const chartDataDespesas = Object.entries(monthlyDespesasMap).map(([mes, valor]) => ({
            mes,
            valor: Math.round(valor * 100) / 100
        }))

        // --- 2. SEÇÃO DE PLANTÕES & COBERTURAS COM FILTROS ---
        const coberturaWhere: any = {
            data: { gte: startOfYear },
            status: { notIn: ['REPROVADO', 'CANCELADO' as any] }
        }

        if (filterDiaristaId && filterDiaristaId !== "ALL") {
            coberturaWhere.diaristaId = filterDiaristaId
        }
        if (filterReservaId && filterReservaId !== "ALL") {
            coberturaWhere.reservaId = filterReservaId
        }
        if (filterMotivoId && filterMotivoId !== "ALL") {
            coberturaWhere.motivoId = filterMotivoId
        }
        if (filterPostoId && filterPostoId !== "ALL") {
            coberturaWhere.postoId = filterPostoId
        }
        if (filterSupervisorId && filterSupervisorId !== "ALL") {
            coberturaWhere.supervisorId = filterSupervisorId
        }

        // Se for supervisor, filtra apenas os postos sob sua responsabilidade
        if (user.role === 'SUPERVISOR') {
            coberturaWhere.posto = {
                supervisores: { some: { id: user.id } }
            }
        }

        const coberturasAnoVigente = await prisma.cobertura.findMany({
            where: coberturaWhere,
            include: {
                motivo: true
            }
        })

        // Acumulado por Tipo / Motivo de Diária
        const motivoStatsMap: { [key: string]: { id: string; descricao: string; count: number; totalValor: number } } = {}
        let totalQtdCoberturas = 0
        let totalValorCoberturas = 0

        // Gráfico do Ano Vigente (Jan a Dez)
        const yearMonthsMap: { [key: number]: { mesLabel: string; valor: number; qtd: number } } = {}
        for (let m = 0; m < 12; m++) {
            yearMonthsMap[m] = {
                mesLabel: `${monthsShort[m]}/${String(currentYear).slice(-2)}`,
                valor: 0,
                qtd: 0
            }
        }

        for (const c of coberturasAnoVigente) {
            const val = Number(c.valor)
            totalQtdCoberturas += 1
            totalValorCoberturas += val

            const motivoNome = c.motivo?.descricao || "Outros Motivos"
            if (!motivoStatsMap[motivoNome]) {
                motivoStatsMap[motivoNome] = {
                    id: c.motivoId || motivoNome,
                    descricao: motivoNome,
                    count: 0,
                    totalValor: 0
                }
            }
            motivoStatsMap[motivoNome].count += 1
            motivoStatsMap[motivoNome].totalValor += val

            const date = new Date(c.data)
            const monthIdx = date.getMonth()
            if (yearMonthsMap[monthIdx]) {
                yearMonthsMap[monthIdx].valor += val
                yearMonthsMap[monthIdx].qtd += 1
            }
        }

        const statsPorMotivo = Object.values(motivoStatsMap).map(item => ({
            ...item,
            totalValor: Math.round(item.totalValor * 100) / 100
        }))

        const chartDataCoberturasAno = Object.values(yearMonthsMap).map(item => ({
            mes: item.mesLabel,
            valor: Math.round(item.valor * 100) / 100,
            qtd: item.qtd
        }))

        // Opções para os Filtros
        const [diaristas, reservas, motivos, postos, supervisores] = await Promise.all([
            prisma.diarista.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
            prisma.reserva.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
            prisma.motivo.findMany({ where: { ativo: true }, select: { id: true, descricao: true }, orderBy: { descricao: 'asc' } }),
            prisma.posto.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
            prisma.user.findMany({ where: { role: { in: ['SUPERVISOR', 'ADMIN'] } }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } })
        ])

        return NextResponse.json({
            // Dados Despesas
            stats: {
                totalMinhasDespesas: Math.round(totalMinhasDespesas * 100) / 100,
                totalPendenteDesconto: Math.round(totalPendenteDesconto * 100) / 100,
                totalPendentePrestacao: Math.round(totalPendentePrestacao * 100) / 100,
                totalDespesaMensal: Math.round(totalDespesaMensal * 100) / 100
            },
            chartData: chartDataDespesas,

            // Dados Plantões & Coberturas
            coberturasStats: {
                totalQtd: totalQtdCoberturas,
                totalValor: Math.round(totalValorCoberturas * 100) / 100,
                statsPorMotivo,
                chartDataAno: chartDataCoberturasAno,
                anoVigente: currentYear
            },

            // Opções dos Filtros
            filterOptions: {
                diaristas,
                reservas,
                motivos,
                postos,
                supervisores
            }
        })
    } catch (error) {
        console.error("Erro ao gerar estatísticas do dashboard:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
