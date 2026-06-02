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
        let totalPendenteDevolucao = 0 // saldoFinal > 0 or unproven advances
        let totalPendenteReembolsoComp = 0 // saldoFinal < 0 or unpaid reembolsos

        for (const d of allDespesasForStats) {
            const valorSolicitado = Number(d.valorSolicitado)
            const valorComprovado = d.valorComprovado !== null ? Number(d.valorComprovado) : null
            const saldo = d.saldoFinal !== null ? Number(d.saldoFinal) : 0

            if (d.tipo === 'ADIANTAMENTO') {
                // totalAdiantado: count valorComprovado if CONCLUIDO, else valorSolicitado if paid.
                const isPaid = ['PAGO', 'AGUARDANDO_PRESTACAO', 'AGUARDANDO_CONCILIACAO', 'CONCLUIDO'].includes(d.status) || 
                               (['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2'].includes(d.status) && valorComprovado !== null)

                if (isPaid) {
                    if (d.status === 'CONCLUIDO') {
                        totalAdiantado += (valorComprovado !== null ? valorComprovado : valorSolicitado)
                    } else {
                        totalAdiantado += valorSolicitado
                    }
                }

                // totalPendenteDevolucao (A Receber): include pending advance amount or positive saldoFinal
                if (d.status === 'AGUARDANDO_PRESTACAO') {
                    if (valorComprovado === null) {
                        totalPendenteDevolucao += valorSolicitado
                    } else if (saldo > 0) {
                        totalPendenteDevolucao += saldo
                    }
                } else if (['AGUARDANDO_CONCILIACAO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2'].includes(d.status) && isPaid) {
                    if (saldo > 0) {
                        totalPendenteDevolucao += saldo
                    }
                }

                // totalPendenteReembolsoComp (A Pagar): include negative saldoFinal for advances
                if (d.status === 'AGUARDANDO_PRESTACAO') {
                    if (valorComprovado !== null && saldo < 0) {
                        totalPendenteReembolsoComp += Math.abs(saldo)
                    }
                } else if (['AGUARDANDO_CONCILIACAO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2'].includes(d.status) && isPaid) {
                    if (saldo < 0) {
                        totalPendenteReembolsoComp += Math.abs(saldo)
                    }
                }
            } else if (d.tipo === 'REEMBOLSO') {
                // totalReembolsado: paid reembolsos
                if (['PAGO', 'CONCLUIDO'].includes(d.status)) {
                    totalReembolsado += valorSolicitado
                }

                // totalPendenteReembolsoComp (A Pagar): include valorSolicitado for all Reembolsos in AGUARDANDO_APROVACAO or APROVADO or N1/N2
                if (['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2', 'APROVADO'].includes(d.status)) {
                    totalPendenteReembolsoComp += valorSolicitado
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
