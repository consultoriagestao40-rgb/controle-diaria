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
        const { id, acao, justificativa } = body // acao: 'APROVAR' | 'REPROVAR' | 'AJUSTE'

        if (!id || !acao) return new NextResponse("Missing fields", { status: 400 })

        // Fetch current item to validate status vs role
        const cobertura = await prisma.cobertura.findUnique({ where: { id } })
        if (!cobertura) return new NextResponse("Item not found", { status: 404 })

        let newStatus: any = 'PENDENTE'
        let dataUpdate: any = {}
        const currentStatus = cobertura.status

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
                dataUpdate.justificativaAprovacaoN1 = justificativa
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
            if (currentStatus !== 'APROVADO_N1' && currentStatus !== 'PENDENTE') { // Allow PENDENTE for Legacy/Safety? decisions: Force N1 > N2 flow.
                // Wait, if we migrate old items are PENDENTE. N2 should see PENDENTE?
                // Plan: N1 sees PENDENTE. N2 sees APROVADO_N1.
                // If there are legacy items in PENDENTE, N2 can't see them? 
                // Let's strict: PENDENTE -> N1 -> APROVADO_N1 -> N2 -> APROVADO.
                // Exception: If user uses legacy APROVADOR role, maybe allow PENDENTE approval directly (bypass)?
                // Let's enforce flow, unless it's strictly legacy APROVADOR role which might need to clear backlog.
                // If role is APROVADOR_N2 coverage MUST be APROVADO_N1.
                // If role is APROVADOR coverage CAN be PENDENTE (legacy support).
            }

            // Forced Flow Enforcer
            if (user.role === 'APROVADOR_N2' && currentStatus !== 'APROVADO_N1') {
                // Allow approving PENDENTE if no N1 exists? No user requested N1->N2. 
                // We will block unless status is correct.
                return new NextResponse("Item must be approved by N1 first", { status: 400 })
            }

            if (acao === 'APROVAR') {
                newStatus = 'APROVADO'
                dataUpdate.aprovadorId = user.id
                dataUpdate.dataAprovacao = new Date()
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
            // Admin can push from PENDENTE to APROVADO_N1 OR directly to APROVADO?
            // Let's assume Admin acts as the Highest Level necessary.
            if (currentStatus === 'PENDENTE') {
                // Admin acting as N1
                if (acao === 'APROVAR') {
                    newStatus = 'APROVADO_N1'
                    dataUpdate.aprovadorN1Id = user.id
                    dataUpdate.dataAprovacaoN1 = new Date()
                }
            } else if (currentStatus === 'APROVADO_N1') {
                // Admin acting as N2
                if (acao === 'APROVAR') {
                    newStatus = 'APROVADO'
                    dataUpdate.aprovadorId = user.id
                    dataUpdate.dataAprovacao = new Date()
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

        // Transaction to update Status and Add History
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
                    observacao: `Ação: ${acao} (${user.role}). ${justificativa || ''}`
                }
            })
        ])

        // Notify Supervisor if Rejected or Adjustment requested
        // TODO: Notify N1 if N2 rejects? Maybe later.
        await notifyStatusChange(id, newStatus, justificativa)

        return NextResponse.json({ success: true, newStatus })
    } catch (error) {
        console.error("Action Error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
