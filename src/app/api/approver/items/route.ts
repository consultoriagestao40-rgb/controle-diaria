import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyStatusChange } from "@/lib/email"

// Helper to determine what status to look for based on role
function getTargetStatusForRole(role: string) {
    if (role === 'APROVADOR_N1') return ['PENDENTE']
    if (role === 'APROVADOR_N2' || role === 'APROVADOR') return ['APROVADO_N1']
    if (role === 'ADMIN') return ['PENDENTE', 'APROVADO_N1'] // Admin sees all pending work
    return []
}

// GET: List items waiting for approval based on User Role
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    const allowedRoles = ['APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    const targetStatuses = getTargetStatusForRole(user.role)

    try {
        const pendencias = await prisma.cobertura.findMany({
            where: {
                status: { in: targetStatuses as any }
            },
            include: {
                posto: true,
                diarista: true,
                motivo: true,
                reserva: true,
                ponto: true,
                cargaHoraria: true,
                supervisor: { select: { nome: true } },
                aprovadorN1: { select: { nome: true } }, // Show who approved in N1 (if applicable)
                meioPagamentoSolicitado: true,
                empresa: true
            },
            orderBy: { data: 'asc' }
        })

        // Enhance with count of approved/paid items for the same diarista in the same month
        const enhancedPendencias = await Promise.all(pendencias.map(async (item) => {
            const date = new Date(item.data)
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
            endOfMonth.setHours(23, 59, 59, 999)

            const count = await prisma.cobertura.count({
                where: {
                    diaristaId: item.diaristaId,
                    status: { in: ['APROVADO', 'PAGO'] },
                    data: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            })

            // Count items where this Colaborador (reserva) was covered (absence count)
            let countColaborador = 0
            if (item.reservaId) {
                countColaborador = await prisma.cobertura.count({
                    where: {
                        reservaId: item.reservaId,
                        status: { in: ['APROVADO', 'PAGO'] },
                        data: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    }
                })
            }

            return {
                ...item,
                diariasNoMes: count,
                faltasNoMes: countColaborador
            }
        }))

        return NextResponse.json(enhancedPendencias)
    } catch (error) {
        console.error("Error fetching approval items:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Handle Actions (Approve, Reject, Adjust)
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
        const { id, acao, justificativa, novoValor } = body // acao: 'APROVAR' | 'REPROVAR' | 'AJUSTE'

        if (!id || !acao) return new NextResponse("Missing fields", { status: 400 })

        // Fetch current item to validate status vs role
        const cobertura = await prisma.cobertura.findUnique({ where: { id } })
        if (!cobertura) return new NextResponse("Item not found", { status: 404 })

        let newStatus: any = 'PENDENTE'
        let dataUpdate: any = {}
        const currentStatus = cobertura.status

        // Value adjustment evaluation (applicable on approval)
        const valorAnterior = Number(cobertura.valor)
        let valorAlterado = false
        let valorAprovadoFinal = valorAnterior

        if (novoValor !== undefined && novoValor !== null && novoValor !== "") {
            const parsedNovoValor = Number(novoValor)
            if (!isNaN(parsedNovoValor) && parsedNovoValor > 0 && Math.abs(parsedNovoValor - valorAnterior) > 0.009) {
                valorAlterado = true
                valorAprovadoFinal = parsedNovoValor
                dataUpdate.valor = parsedNovoValor
            }
        }

        const ajusteAprovacaoNota = valorAlterado
            ? `[Valor ajustado de R$ ${valorAnterior.toFixed(2).replace('.', ',')} para R$ ${valorAprovadoFinal.toFixed(2).replace('.', ',')}] `
            : ""

        // --- Logic Board ---
        // ROLE: APROVADOR_N1
        if (user.role === 'APROVADOR_N1') {
            if (currentStatus !== 'PENDENTE') {
                return new NextResponse("Item not in PENDENTE state", { status: 400 })
            }

            if (acao === 'APROVAR') {
                newStatus = 'APROVADO_N1'
                dataUpdate.aprovadorN1Id = user.id
                dataUpdate.dataAprovacaoN1 = new Date()
                dataUpdate.justificativaAprovacaoN1 = `${ajusteAprovacaoNota}${justificativa || ''}`.trim()
            } else if (acao === 'REPROVAR') {
                newStatus = 'REPROVADO'
                dataUpdate.justificativaReprovacao = `[N1] ${justificativa}`
            } else if (acao === 'AJUSTE') {
                newStatus = 'AJUSTE'
                dataUpdate.ajusteSolicitado = `[N1] ${justificativa}`
            }
        }
        // ROLE: APROVADOR_N2 (or Legacy APROVADOR)
        else if (user.role === 'APROVADOR_N2' || user.role === 'APROVADOR') {
            if (currentStatus !== 'APROVADO_N1' && currentStatus !== 'PENDENTE') {
                // Check allowed flow
            }

            // Forced Flow Enforcer
            if (user.role === 'APROVADOR_N2' && currentStatus !== 'APROVADO_N1') {
                return new NextResponse("Item must be approved by N1 first", { status: 400 })
            }

            if (acao === 'APROVAR') {
                newStatus = 'APROVADO'
                dataUpdate.aprovadorId = user.id
                dataUpdate.dataAprovacao = new Date()
                dataUpdate.justificativaAprovacaoN2 = `${ajusteAprovacaoNota}${justificativa || ''}`.trim()
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
                // Admin acting as N1
                if (acao === 'APROVAR') {
                    newStatus = 'APROVADO_N1'
                    dataUpdate.aprovadorN1Id = user.id
                    dataUpdate.dataAprovacaoN1 = new Date()
                    dataUpdate.justificativaAprovacaoN1 = `${ajusteAprovacaoNota}${justificativa || ''}`.trim()
                }
            } else if (currentStatus === 'APROVADO_N1') {
                // Admin acting as N2
                if (acao === 'APROVAR') {
                    newStatus = 'APROVADO'
                    dataUpdate.aprovadorId = user.id
                    dataUpdate.dataAprovacao = new Date()
                    dataUpdate.justificativaAprovacaoN2 = `${ajusteAprovacaoNota}${justificativa || ''}`.trim()
                }
            }
            // Common rejection logic
            if (acao === 'REPROVAR') {
                newStatus = 'REPROVADO'
                dataUpdate.justificativaReprovacao = `[ADMIN] ${justificativa}`
            } else if (acao === 'AJUSTE') {
                newStatus = 'AJUSTE'
                dataUpdate.ajusteSolicitado = `[ADMIN] ${justificativa}`
            }
        }

        if (!newStatus || newStatus === 'PENDENTE') {
            return new NextResponse("Invalid State Transition", { status: 400 })
        }

        const obsWorkflow = valorAlterado
            ? `Ação: ${acao} (${user.role}). Valor ajustado de R$ ${valorAnterior.toFixed(2).replace('.', ',')} para R$ ${valorAprovadoFinal.toFixed(2).replace('.', ',')}. ${justificativa || ''}`.trim()
            : `Ação: ${acao} (${user.role}). ${justificativa || ''}`.trim()

        // Transaction to update Status, Value and Add History
        await prisma.$transaction([
            prisma.cobertura.update({
                where: { id },
                data: {
                    status: newStatus,
                    ...dataUpdate
                }
            }),
            prisma.historicoWorkflow.create({
                data: {
                    coberturaId: id,
                    deStatus: currentStatus,
                    paraStatus: newStatus,
                    usuarioId: user.id,
                    observacao: obsWorkflow
                }
            })
        ])

        // If approved (Final Approval), create Conta Azul Payable bill if active
        if (newStatus === 'APROVADO') {
            try {
                const { createPayableFromCobertura } = await import("@/lib/contaazul")
                const caResult = await createPayableFromCobertura(id)
                if (caResult.success) {
                    await prisma.historicoWorkflow.create({
                        data: {
                            coberturaId: id,
                            deStatus: 'APROVADO',
                            paraStatus: 'APROVADO',
                            usuarioId: user.id,
                            observacao: `[Conta Azul] Lançamento de Contas a Pagar criado com sucesso (ID: ${caResult.payableId})`
                        }
                    })
                }
            } catch (caErr: any) {
                console.error("[CONTA AZUL TRIGGER ERROR]", caErr)
            }
        }

        // Notify Supervisor if Rejected or Adjustment requested
        // TODO: Notify N1 if N2 rejects? Maybe later.
        await notifyStatusChange(id, newStatus, justificativa)

        return NextResponse.json({ success: true, newStatus })
    } catch (error) {
        console.error("Action Error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// PATCH: Directly adjust coverage value (e.g. by N2, N1 or Admin before/during approval)
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    const allowedRoles = ['APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, valor, justificativa } = body

        if (!id || valor === undefined || valor === null) {
            return new NextResponse("Campos obrigatórios ausentes", { status: 400 })
        }

        const novoValorNum = Number(valor)
        if (isNaN(novoValorNum) || novoValorNum <= 0) {
            return new NextResponse("Valor inválido. Deve ser maior que zero.", { status: 400 })
        }

        const cobertura = await prisma.cobertura.findUnique({ where: { id } })
        if (!cobertura) return new NextResponse("Item não encontrado", { status: 404 })

        const valorAnterior = Number(cobertura.valor)
        if (Math.abs(novoValorNum - valorAnterior) < 0.009) {
            return NextResponse.json({ success: true, message: "Valor inalterado", valor: valorAnterior })
        }

        const observacao = `[Ajuste de Valor - ${user.role}] Valor alterado de R$ ${valorAnterior.toFixed(2).replace('.', ',')} para R$ ${novoValorNum.toFixed(2).replace('.', ',')} por ${user.nome || user.email || 'Aprovador'}.${justificativa ? ` Justificativa: ${justificativa}` : ''}`

        await prisma.$transaction([
            prisma.cobertura.update({
                where: { id },
                data: { valor: novoValorNum }
            }),
            prisma.historicoWorkflow.create({
                data: {
                    coberturaId: id,
                    deStatus: cobertura.status,
                    paraStatus: cobertura.status,
                    usuarioId: user.id,
                    observacao
                }
            })
        ])

        return NextResponse.json({ success: true, novoValor: novoValorNum, valorAnterior })
    } catch (error) {
        console.error("Error updating cobertura valor:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

