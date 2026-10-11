import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPayableFromDespesa, createPayableFromGroupedDespesas } from "@/lib/contaazul"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    const allowedRoles = ['SUPERVISOR', 'APROVADOR_N1', 'APROVADOR_N2', 'APROVADOR', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { ids, acao, justificativa } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0 || !acao) {
            return new NextResponse(
                JSON.stringify({ error: "Parâmetros inválidos. Forneça uma lista de IDs e a ação." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        if (acao !== 'APROVAR' && acao !== 'REPROVAR') {
            return new NextResponse(
                JSON.stringify({ error: "Ação inválida. Use APROVAR ou REPROVAR." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        if (acao === 'REPROVAR' && !justificativa) {
            return new NextResponse(
                JSON.stringify({ error: "Justificativa é obrigatória para reprovações em lote." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const validStatuses = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2', 'AGUARDANDO_CONCILIACAO']
        const despesas = await prisma.despesa.findMany({
            where: {
                id: { in: ids },
                status: { in: validStatuses as any }
            },
            include: {
                solicitante: true,
                empresa: true,
                centroCusto: true
            }
        })

        if (despesas.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "Nenhuma despesa pendente encontrada para os IDs selecionados." }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }

        const approvedFinalIds: string[] = []
        let processedCount = 0

        for (const desp of despesas) {
            const isPrestacao = desp.tipo === 'ADIANTAMENTO' && (desp.status === 'AGUARDANDO_CONCILIACAO' || desp.valorComprovado !== null)
            let novoStatus: any = 'RASCUNHO'

            if (acao === 'APROVAR') {
                if (desp.status === 'AGUARDANDO_APROVACAO_N1' && user.role === 'APROVADOR_N1') {
                    novoStatus = 'AGUARDANDO_APROVACAO_N2'
                } else {
                    novoStatus = isPrestacao ? 'CONCLUIDO' : 'APROVADO'
                }
            } else {
                novoStatus = isPrestacao ? 'AGUARDANDO_PRESTACAO' : 'REPROVADO'
            }

            await prisma.$transaction(async (tx) => {
                await tx.despesa.update({
                    where: { id: desp.id },
                    data: {
                        status: novoStatus,
                        aprovadorId: user.id,
                        dataAprovacao: acao === 'APROVAR' ? new Date() : desp.dataAprovacao,
                        justificativaAprovacao: acao === 'APROVAR' ? (justificativa || "Aprovado em lote pelo gestor.") : desp.justificativaAprovacao,
                        justificativaReprovacao: acao === 'REPROVAR' ? justificativa : desp.justificativaReprovacao,
                        ...(acao === 'REPROVAR' && isPrestacao ? {
                            valorComprovado: null,
                            saldoFinal: null
                        } : {})
                    }
                })

                let obs = ""
                if (isPrestacao) {
                    obs = acao === 'APROVAR'
                        ? (novoStatus === 'AGUARDANDO_APROVACAO_N2'
                            ? `Prestação aprovada em lote N1 por ${user.nome}.`
                            : `Prestação aprovada em lote por ${user.nome}. Despesa baixada com sucesso.`)
                        : `Prestação devolvida em lote por ${user.nome}. Motivo: ${justificativa}`
                } else {
                    obs = acao === 'APROVAR'
                        ? (novoStatus === 'AGUARDANDO_APROVACAO_N2'
                            ? `Solicitação aprovada em lote N1 por ${user.nome}.`
                            : `Solicitação aprovada em lote por ${user.nome}. Integrando com Conta Azul...`)
                        : `Solicitação reprovada em lote por ${user.nome}. Motivo: ${justificativa}`
                }

                await tx.historicoDespesa.create({
                    data: {
                        despesaId: desp.id,
                        deStatus: desp.status,
                        paraStatus: novoStatus,
                        usuarioId: user.id,
                        observacao: obs
                    }
                })
            })

            if (novoStatus === 'APROVADO') {
                approvedFinalIds.push(desp.id)
            }
            processedCount++
        }

        // Consolidação no ERP Conta Azul:
        // Agrupa por colaborador + empresa para gerar 1 único Contas a Pagar por lote do colaborador!
        let payablesCreated = 0
        const caErrors: string[] = []

        if (approvedFinalIds.length > 0) {
            const finalApprovedDespesas = await prisma.despesa.findMany({
                where: { id: { in: approvedFinalIds } },
                include: { solicitante: true, empresa: true }
            })

            // Chave de agrupamento: empresaId + solicitanteId
            const groupMap = new Map<string, string[]>()
            for (const d of finalApprovedDespesas) {
                const empId = d.empresaId || "DEFAULT"
                const key = `${empId}_${d.solicitanteId}`
                if (!groupMap.has(key)) {
                    groupMap.set(key, [])
                }
                groupMap.get(key)!.push(d.id)
            }

            for (const [key, groupDespesaIds] of Array.from(groupMap.entries())) {
                try {
                    let caRes: any = null
                    if (groupDespesaIds.length === 1) {
                        caRes = await createPayableFromDespesa(groupDespesaIds[0])
                    } else {
                        // Consolida múltiplas despesas em um ÚNICO Contas a Pagar no Conta Azul
                        caRes = await createPayableFromGroupedDespesas(groupDespesaIds)
                    }

                    if (caRes?.success) {
                        payablesCreated++
                        // Log do evento no histórico de cada uma das despesas consolidadas
                        for (const despId of groupDespesaIds) {
                            await prisma.historicoDespesa.create({
                                data: {
                                    despesaId: despId,
                                    deStatus: 'APROVADO',
                                    paraStatus: 'APROVADO',
                                    usuarioId: user.id,
                                    observacao: `[Conta Azul] Lote consolidado (${groupDespesaIds.length} itens). Título Contas a Pagar gerado com sucesso (ID: ${caRes.payableId})`
                                }
                            })
                        }
                    } else if (caRes?.error) {
                        caErrors.push(`Lote ${key}: ${caRes.error}`)
                    }
                } catch (caErr: any) {
                    console.error(`[BATCH CA DESPESAS ERROR] Grupo ${key}:`, caErr)
                    caErrors.push(`Lote ${key}: ${caErr.message || 'Erro inesperado no Conta Azul'}`)
                }
            }
        }

        return NextResponse.json({
            success: true,
            processedCount,
            payablesCreated,
            caErrors: caErrors.length > 0 ? caErrors : undefined,
            message: `${processedCount} despesa(s) processada(s) com sucesso. ${payablesCreated > 0 ? `${payablesCreated} lançamento(s) gerado(s) no Conta Azul.` : ''}`
        })
    } catch (error: any) {
        console.error("Erro na aprovação em lote de despesas:", error)
        return new NextResponse(
            JSON.stringify({ error: error.message || "Erro interno ao processar lote." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}
