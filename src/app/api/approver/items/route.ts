import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyStatusChange } from "@/lib/email"

// GET: List items waiting for approval (Status = PENDENTE)
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    // Ensure Role is Approver or Admin
    if (user.role !== 'APROVADOR' && user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const pendencias = await prisma.cobertura.findMany({
            where: { status: 'PENDENTE' },
            include: {
                posto: true,
                diarista: true,
                motivo: true,
                reserva: true,
                cargaHoraria: true,
                supervisor: { select: { nome: true } },
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
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Handle Actions (Approve, Reject, Adjust)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'APROVADOR' && user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, acao, justificativa } = body // acao: 'APROVAR' | 'REPROVAR' | 'AJUSTE'

        if (!id || !acao) return new NextResponse("Missing fields", { status: 400 })

        let newStatus: any = 'PENDENTE'
        let dataUpdate: any = {
            aprovadorId: user.id,
            dataAprovacao: new Date() // Audit timestamp
        }

        if (acao === 'APROVAR') {
            newStatus = 'APROVADO'
        } else if (acao === 'REPROVAR') {
            newStatus = 'REPROVADO'
            dataUpdate.justificativaReprovacao = justificativa
        } else if (acao === 'AJUSTE') {
            newStatus = 'AJUSTE'
            dataUpdate.ajusteSolicitado = justificativa
            // Reset approval data if any? No, keep track who asked.
        } else {
            return new NextResponse("Invalid action", { status: 400 })
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
                    deStatus: 'PENDENTE', // Assuming it was pending. Ideally fetch first but ok for V1.
                    paraStatus: newStatus,
                    usuarioId: user.id,
                    observacao: `Ação: ${acao}. ${justificativa || ''}`
                }
            })
        ])

        // Notify Supervisor if Rejected or Adjustment requested
        await notifyStatusChange(id, newStatus, justificativa)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
