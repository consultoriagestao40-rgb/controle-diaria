import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any
    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN' && user.role !== 'ENCARREGADO' && user.role !== 'APROVADOR_N1' && user.role !== 'APROVADOR_N2' && user.role !== 'APROVADOR') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
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
            horaInicio,
            horaFim,
            observacao
        } = body

        // Basic Validation
        if (!data || !postoId || !diaristaId || !motivoId || !valor || !reservaId || !cargaHorariaId || !meioPagamentoSolicitadoId) {
            return new NextResponse(
                JSON.stringify({ error: "Todos os campos obrigatórios devem ser preenchidos." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const launchDate = new Date(data)
        const startOfDay = new Date(launchDate.getFullYear(), launchDate.getMonth(), launchDate.getDate())
        const endOfDay = new Date(launchDate.getFullYear(), launchDate.getMonth(), launchDate.getDate() + 1)

        const cobertura = await prisma.cobertura.create({
            data: {
                data: launchDate,
                postoId,
                diaristaId,
                reservaId, // Quem faltou (ou banco)
                motivoId, // Motivo da falta
                cargaHorariaId,
                meioPagamentoSolicitadoId, // Como a diarista quer receber
                empresaId: body.empresaId,
                valor: parseFloat(valor), // Ensure float
                horaInicio,
                horaFim,
                observacao,
                supervisorId: user.id,
                status: 'PENDENTE'
            }
        })

        return NextResponse.json(cobertura)
    } catch (error) {
        console.error("Erro ao criar cobertura:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
