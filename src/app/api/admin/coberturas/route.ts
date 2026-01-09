import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: List ALL items for Admin
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')

    const status = searchParams.get('status')

    let where: any = {}
    if (startStr && endStr) {
        const startDate = new Date(startStr)
        const endDate = new Date(endStr)
        endDate.setHours(23, 59, 59, 999) // End of day

        where.data = {
            gte: startDate,
            lte: endDate
        }
    }

    const status = searchParams.get('status')
    const diaristaId = searchParams.get('diaristaId')
    const postoId = searchParams.get('postoId')
    const reservaId = searchParams.get('reservaId')
    const motivoId = searchParams.get('motivoId')
    const supervisorId = searchParams.get('supervisorId')

    let where: any = {}
    if (startStr && endStr) {
        const startDate = new Date(startStr)
        const endDate = new Date(endStr)
        endDate.setHours(23, 59, 59, 999) // End of day

        where.data = {
            gte: startDate,
            lte: endDate
        }
    }

    if (status && status !== 'ALL') where.status = status
    if (diaristaId && diaristaId !== 'ALL') where.diaristaId = diaristaId
    if (postoId && postoId !== 'ALL') where.postoId = postoId
    if (reservaId && reservaId !== 'ALL') where.reservaId = reservaId
    if (motivoId && motivoId !== 'ALL') where.motivoId = motivoId
    if (supervisorId && supervisorId !== 'ALL') where.supervisorId = supervisorId

    try {
        const coberturas = await prisma.cobertura.findMany({
            where,
            include: {
                posto: true,
                diarista: true,
                reserva: true,
                motivo: true,
                supervisor: { select: { nome: true } },
                aprovador: { select: { nome: true } },
                financeiro: { select: { nome: true } }
            },
            orderBy: { data: 'desc' },
            take: (startStr && endStr) ? undefined : 200 // Remove limit if filtering, else safety limit
        })

        return NextResponse.json(coberturas)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
