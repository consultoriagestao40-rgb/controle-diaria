import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    const allowedRoles = ['ADMIN', 'FINANCEIRO', 'RH']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const solicitanteId = searchParams.get("solicitanteId")
    const tipo = searchParams.get("tipo") // REEMBOLSO ou ADIANTAMENTO
    const status = searchParams.get("status")

    try {
        // 1. Monta o filtro principal
        const where: any = {}
        if (solicitanteId) where.solicitanteId = solicitanteId
        if (tipo) where.tipo = tipo
        if (status) where.status = status

        // 2. Busca as despesas detalhadas para a tabela do relatório
        const despesas = await prisma.despesa.findMany({
            where,
            include: {
                solicitante: {
                    select: { id: true, nome: true, email: true, role: true }
                },
                anexos: true
            },
            orderBy: { createdAt: 'desc' }
        })

        // 3. Busca a lista de colaboradores únicos que possuem solicitações de despesas (para carregar no filtro do front)
        const solicitantesUnicos = await prisma.user.findMany({
            where: {
                despesasSolicitadas: { some: {} }
            },
            select: {
                id: true,
                nome: true,
                email: true
            },
            orderBy: { nome: 'asc' }
        })

        // 4. Calcula métricas consolidadas baseadas em TODAS as despesas (ou conforme filtros)
        // Calculamos:
        // - Total Adiantamentos Pagos: (PAGO, AGUARDANDO_PRESTACAO, AGUARDANDO_CONCILIACAO, CONCLUIDO)
        // - Total Reembolsos Efetuados: (PAGO, CONCLUIDO)
        // - Saldo Devedor Pendente (Colaboradores devem devolver)
        // - Saldo Credor Pendente (Empresa deve pagar complementar)
        
        const allDespesasForStats = await prisma.despesa.findMany({ where })

        let totalAdiantado = 0
        let totalReembolsado = 0
        let totalPendenteDevolucao = 0 // saldoFinal > 0
        let totalPendenteReembolsoComp = 0 // saldoFinal < 0

        for (const d of allDespesasForStats) {
            const valorSolicitado = Number(d.valorSolicitado)
            const saldo = d.saldoFinal ? Number(d.saldoFinal) : 0

            if (d.tipo === 'ADIANTAMENTO') {
                if (['PAGO', 'AGUARDANDO_PRESTACAO', 'AGUARDANDO_CONCILIACAO', 'CONCLUIDO'].includes(d.status)) {
                    totalAdiantado += valorSolicitado
                }
                
                if (d.status === 'AGUARDANDO_PRESTACAO' || d.status === 'AGUARDANDO_CONCILIACAO') {
                    if (saldo > 0) totalPendenteDevolucao += saldo
                    if (saldo < 0) totalPendenteReembolsoComp += Math.abs(saldo)
                }
            } else if (d.tipo === 'REEMBOLSO') {
                if (['PAGO', 'CONCLUIDO'].includes(d.status)) {
                    totalReembolsado += valorSolicitado
                }
            }
        }

        return NextResponse.json({
            despesas,
            solicitantes: solicitantesUnicos,
            stats: {
                totalAdiantado,
                totalReembolsado,
                totalPendenteDevolucao,
                totalPendenteReembolsoComp,
                totalDespesasContadas: allDespesasForStats.length
            }
        })
    } catch (error) {
        console.error("Erro ao gerar relatórios:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
