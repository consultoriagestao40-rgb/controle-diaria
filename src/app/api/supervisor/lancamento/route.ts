import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any
    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN' && user.role !== 'ENCARREGADO') {
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

        // 1. Check for Double Booking of Diarista (DISABLED TO UNBLOCK)
        /*
        const existingDiarista = await prisma.cobertura.findFirst({
            where: {
                diaristaId,
                status: { not: 'REPROVADO' }, // Ignore rejected ones
                data: { gte: startOfDay, lt: endOfDay }
            }
        })

        if (existingDiarista) {
            return new NextResponse(
                JSON.stringify({ error: "Esta Diarista já possui um agendamento para esta data." }),
                { status: 409 }
            )
        }
        */

        // 2. Check for Double Coverage of Colaborador (Cannot be covered twice same day)
        // EXCEPTION: "Banco de Reservas" allows multiple
        /*
        if (reservaId) {
            const reserva = await prisma.reserva.findUnique({
                where: { id: reservaId },
                select: { nome: true }
            })

            const isBanco = reserva?.nome.toLowerCase().includes("banco")

            if (!isBanco) {
                const existingReserva = await prisma.cobertura.findFirst({
                    where: {
                        reservaId,
                        status: { not: 'REPROVADO' },
                        data: { gte: startOfDay, lt: endOfDay }
                    }
                })

                if (existingReserva) {
                    return new NextResponse(
                        JSON.stringify({ error: "Este Colaborador já possui uma cobertura para esta data." }),
                        { status: 409, headers: { "Content-Type": "application/json" } }
                    )
                }
            }
        }
        */

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
