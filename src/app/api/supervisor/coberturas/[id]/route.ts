import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET Single Cobertura
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    try {
        const { id } = await params
        const cobertura = await prisma.cobertura.findUnique({
            where: { id },
            include: {
                posto: true,
                diarista: true,
                motivo: true,
                // Include related IDs to check permissions if needed, generally owner or admin check
            }
        })

        if (!cobertura) return new NextResponse("Not Found", { status: 404 })

        // Check permission: Owner or Admin
        if (user.role !== 'ADMIN' && cobertura.supervisorId !== user.id) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        return NextResponse.json(cobertura)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// PUT Update Cobertura (Resubmit)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    try {
        const { id } = await params
        const body = await req.json()
        const {
            data,
            postoId,
            diaristaId,
            reservaId,
            motivoId,
            cargaHorariaId,
            valor,
            meioPagamentoSolicitadoId,
            observacao
        } = body

        // Verify ownership
        const existing = await prisma.cobertura.findUnique({ where: { id } })
        if (!existing) return new NextResponse("Not Found", { status: 404 })
        if (user.role !== 'ADMIN' && existing.supervisorId !== user.id) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        // Update and Reset Status to PENDENTE
        const updated = await prisma.$transaction([
            prisma.cobertura.update({
                where: { id },
                data: {
                    data: new Date(data),
                    postoId,
                    diaristaId,
                    reservaId,
                    motivoId,
                    cargaHorariaId,
                    meioPagamentoSolicitadoId,
                    valor: parseFloat(valor),
                    observacao,
                    status: 'PENDENTE', // Resubmitting triggers Pending status
                    respostaAjuste: 'Ajuste realizado pelo supervisor', // Could be another field
                }
            }),
            prisma.historicoWorkflow.create({
                data: {
                    coberturaId: id,
                    deStatus: existing.status,
                    paraStatus: 'PENDENTE',
                    usuarioId: user.id,
                    observacao: "Correção de dados e reenvio."
                }
            })
        ])

        return NextResponse.json(updated[0])
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
