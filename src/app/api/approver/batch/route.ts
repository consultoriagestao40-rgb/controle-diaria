import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPayableFromCobertura, createPayableFromGroupedCoberturas } from "@/lib/contaazul"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    const allowedRoles = ['APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { ids, acao, justificativa } = body // acao: 'APROVAR' | 'REPROVAR' | 'AJUSTE'

        if (!ids || !Array.isArray(ids) || ids.length === 0 || !acao) {
            return new NextResponse("Missing or invalid fields", { status: 400 })
        }

        const coberturas = await prisma.cobertura.findMany({
            where: { id: { in: ids } },
            include: { diarista: true, posto: true, empresa: true }
        })

        if (coberturas.length === 0) {
            return new NextResponse("Nenhum item encontrado", { status: 404 })
        }

        const approvedFinalIds: string[] = []
        let successCount = 0

        for (const cob of coberturas) {
            let newStatus: any = 'PENDENTE'
            let dataUpdate: any = {}
            const currentStatus = cob.status

            // ROLE: APROVADOR_N1
            if (user.role === 'APROVADOR_N1') {
                if (currentStatus !== 'PENDENTE') continue

                if (acao === 'APROVAR') {
                    newStatus = 'APROVADO_N1'
                    dataUpdate.aprovadorN1Id = user.id
                    dataUpdate.dataAprovacaoN1 = new Date()
                    dataUpdate.justificativaAprovacaoN1 = justificativa
                } else if (acao === 'REPROVAR') {
                    newStatus = 'REPROVADO'
                    dataUpdate.justificativaReprovacao = `[N1] ${justificativa || ''}`
                } else if (acao === 'AJUSTE') {
                    newStatus = 'AJUSTE'
                    dataUpdate.ajusteSolicitado = `[N1] ${justificativa || ''}`
                }
            }
            // ROLE: APROVADOR_N2 ou APROVADOR (Legacy)
            else if (user.role === 'APROVADOR_N2' || user.role === 'APROVADOR') {
                if (user.role === 'APROVADOR_N2' && currentStatus !== 'APROVADO_N1') {
                    continue
                }

                if (acao === 'APROVAR') {
                    newStatus = 'APROVADO'
                    dataUpdate.aprovadorId = user.id
                    dataUpdate.dataAprovacao = new Date()
                    dataUpdate.justificativaAprovacaoN2 = justificativa
                } else if (acao === 'REPROVAR') {
                    newStatus = 'REPROVADO'
                    dataUpdate.justificativaReprovacao = justificativa
                } else if (acao === 'AJUSTE') {
                    newStatus = 'AJUSTE'
                    dataUpdate.ajusteSolicitado = justificativa
                }
            }
            // ROLE: ADMIN (Superuser)
            else if (user.role === 'ADMIN') {
                if (currentStatus === 'PENDENTE') {
                    if (acao === 'APROVAR') {
                        newStatus = 'APROVADO_N1'
                        dataUpdate.aprovadorN1Id = user.id
                        dataUpdate.dataAprovacaoN1 = new Date()
                    }
                } else if (currentStatus === 'APROVADO_N1') {
                    if (acao === 'APROVAR') {
                        newStatus = 'APROVADO'
                        dataUpdate.aprovadorId = user.id
                        dataUpdate.dataAprovacao = new Date()
                        dataUpdate.justificativaAprovacaoN2 = justificativa
                    }
                }
                if (acao === 'REPROVAR') {
                    newStatus = 'REPROVADO'
                    dataUpdate.justificativaReprovacao = `[ADMIN] ${justificativa || ''}`
                } else if (acao === 'AJUSTE') {
                    newStatus = 'AJUSTE'
                    dataUpdate.ajusteSolicitado = `[ADMIN] ${justificativa || ''}`
                }
            }

            if (!newStatus || newStatus === 'PENDENTE') continue

            await prisma.$transaction([
                prisma.cobertura.update({
                    where: { id: cob.id },
                    data: {
                        status: newStatus,
                        ...dataUpdate
                    }
                }),
                prisma.historicoWorkflow.create({
                    data: {
                        coberturaId: cob.id,
                        deStatus: currentStatus,
                        paraStatus: newStatus,
                        usuarioId: user.id,
                        observacao: `Ação em Lote: ${acao} (${user.role}). ${justificativa || ''}`
                    }
                })
            ])

            if (newStatus === 'APROVADO') {
                approvedFinalIds.push(cob.id)
            }
            successCount++
        }

        // Se houve aprovações finais (N2 / APROVADO), consolida os lançamentos no Conta Azul por (empresaId + diaristaId)
        let totalPayablesCreated = 0
        if (approvedFinalIds.length > 0) {
            const finalApprovedItems = await prisma.cobertura.findMany({
                where: { id: { in: approvedFinalIds } },
                include: { diarista: true, posto: true, empresa: true }
            })

            // Agrupa por chave única: empresaId + diaristaId
            const groupMap = new Map<string, string[]>()
            for (const item of finalApprovedItems) {
                const empId = item.empresaId || "DEFAULT"
                const key = `${empId}_${item.diaristaId}`
                if (!groupMap.has(key)) {
                    groupMap.set(key, [])
                }
                groupMap.get(key)!.push(item.id)
            }

            for (const [key, cobIds] of Array.from(groupMap.entries())) {
                try {
                    let caResult
                    if (cobIds.length === 1) {
                        caResult = await createPayableFromCobertura(cobIds[0])
                    } else {
                        caResult = await createPayableFromGroupedCoberturas(cobIds)
                    }

                    if (caResult?.success && caResult?.payableId) {
                        totalPayablesCreated++
                        // Cria registro no histórico para cada item do lote
                        for (const cobId of cobIds) {
                            await prisma.historicoWorkflow.create({
                                data: {
                                    coberturaId: cobId,
                                    deStatus: 'APROVADO',
                                    paraStatus: 'APROVADO',
                                    usuarioId: user.id,
                                    observacao: cobIds.length > 1
                                        ? `[Conta Azul] Lançamento CONSOLIDADO (${cobIds.length} diárias com rateio) criado com sucesso (ID: ${caResult.payableId})`
                                        : `[Conta Azul] Lançamento de Contas a Pagar criado com sucesso (ID: ${caResult.payableId})`
                                }
                            })
                        }
                    }
                } catch (caErr) {
                    console.error("[CONTA AZUL BATCH TRIGGER ERROR]", caErr)
                }
            }
        }

        return NextResponse.json({
            success: true,
            processedCount: successCount,
            finalApprovedCount: approvedFinalIds.length,
            payablesCreated: totalPayablesCreated
        })
    } catch (error) {
        console.error("Batch Approver Error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
