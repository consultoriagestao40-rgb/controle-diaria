import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any

    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // 1. Minhas Despesas (Total Geral)
        const minhasDespesasResult = await prisma.despesa.aggregate({
            _sum: {
                valorSolicitado: true
            },
            where: {
                solicitanteId: user.id
            }
        })
        const totalMinhasDespesas = Number(minhasDespesasResult._sum.valorSolicitado || 0)

        // 2. Pendências para Descontos (saldoFinal > 0 em adiantamentos ativos do usuário)
        const pendenteDescontoResult = await prisma.despesa.aggregate({
            _sum: {
                saldoFinal: true
            },
            where: {
                solicitanteId: user.id,
                tipo: 'ADIANTAMENTO',
                status: {
                    in: ['AGUARDANDO_PRESTACAO', 'AGUARDANDO_CONCILIACAO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2']
                },
                saldoFinal: {
                    gt: 0
                }
            }
        })
        const totalPendenteDesconto = Number(pendenteDescontoResult._sum.saldoFinal || 0)

        // 3. Pendente de Prestação de Contas (Adiantamentos pagos que estão aguardando comprovantes)
        const pendentePrestacaoResult = await prisma.despesa.aggregate({
            _sum: {
                valorSolicitado: true
            },
            where: {
                solicitanteId: user.id,
                tipo: 'ADIANTAMENTO',
                status: 'AGUARDANDO_PRESTACAO',
                valorComprovado: null
            }
        })
        const totalPendentePrestacao = Number(pendentePrestacaoResult._sum.valorSolicitado || 0)

        // 4. Despesa Mensal (Total do mês atual do usuário)
        const despesaMensalResult = await prisma.despesa.aggregate({
            _sum: {
                valorSolicitado: true
            },
            where: {
                solicitanteId: user.id,
                createdAt: {
                    gte: startOfMonth
                }
            }
        })
        const totalDespesaMensal = Number(despesaMensalResult._sum.valorSolicitado || 0)

        // 5. Histórico Mensal para Gráfico (Últimos 6 meses)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
        sixMonthsAgo.setDate(1)
        sixMonthsAgo.setHours(0, 0, 0, 0)

        const despesasRecent = await prisma.despesa.findMany({
            where: {
                solicitanteId: user.id,
                createdAt: {
                    gte: sixMonthsAgo
                }
            },
            select: {
                valorSolicitado: true,
                createdAt: true
            }
        })

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const monthlyDataMap: { [key: string]: number } = {}

        // Inicializar últimos 6 meses com 0
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(now.getMonth() - i)
            const label = `${months[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`
            monthlyDataMap[label] = 0
        }

        for (const d of despesasRecent) {
            const date = new Date(d.createdAt)
            const label = `${months[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`
            if (monthlyDataMap[label] !== undefined) {
                monthlyDataMap[label] += Number(d.valorSolicitado)
            }
        }

        const chartData = Object.entries(monthlyDataMap).map(([mes, valor]) => ({
            mes,
            valor: Math.round(valor * 100) / 100
        }))

        return NextResponse.json({
            stats: {
                totalMinhasDespesas: Math.round(totalMinhasDespesas * 100) / 100,
                totalPendenteDesconto: Math.round(totalPendenteDesconto * 100) / 100,
                totalPendentePrestacao: Math.round(totalPendentePrestacao * 100) / 100,
                totalDespesaMensal: Math.round(totalDespesaMensal * 100) / 100
            },
            chartData
        })
    } catch (error) {
        console.error("Erro ao gerar estatísticas do dashboard:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
