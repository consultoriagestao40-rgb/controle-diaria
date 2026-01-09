import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any
    if (user.role !== 'ADMIN') return new NextResponse("Forbidden", { status: 403 })

    const searchParams = req.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const diaristaId = searchParams.get('diarista')
    const motivoId = searchParams.get('motivo')
    const postoId = searchParams.get('posto')
    const supervisorId = searchParams.get('supervisor')

    console.log(`[Stats API] Raw Params: start=${start}, end=${end}, diarista=${diaristaId}, motivo=${motivoId}, posto=${postoId}, supervisor=${supervisorId}`)

    const dateFilter: any = {}
    if (start && end) {
        // Force UTC parsing to avoid timezone shifts
        // Appending time part ensures strict UTC interpretation
        const startDate = new Date(`${start}T00:00:00.000Z`)
        const endDate = new Date(`${end}T23:59:59.999Z`)

        dateFilter.data = {
            gte: startDate,
            lte: endDate
        }
    }

    const where: any = {
        ...dateFilter,
        status: { in: ['PAGO', 'APROVADO'] }
    }

    if (diaristaId && diaristaId !== 'all') where.diaristaId = diaristaId
    if (motivoId && motivoId !== 'all') where.motivoId = motivoId
    if (postoId && postoId !== 'all') where.postoId = postoId
    if (supervisorId && supervisorId !== 'all') where.supervisorId = supervisorId

    const reservaId = searchParams.get('colaborador') // UI may send 'colaborador'
    if (reservaId && reservaId !== 'all') where.reservaId = reservaId

    try {
        const items = await prisma.cobertura.findMany({
            where,
            include: {
                diarista: true,
                posto: true,
                motivo: true,
                reserva: true
            }
        })

        // Helper to aggregate
        const aggregate = (keyExtractor: (item: any) => string, nameExtractor: (item: any) => string) => {
            const map = new Map<string, { name: string, value: number }>()
            items.forEach(item => {
                const key = keyExtractor(item)
                const name = nameExtractor(item) || 'N/A'
                const val = Number(item.valor) || 0

                if (map.has(key)) {
                    map.get(key)!.value += val
                } else {
                    map.set(key, { name, value: val })
                }
            })
            return Array.from(map.values())
                .sort((a, b) => b.value - a.value) // Descending
                .slice(0, 5) // Top 5
        }

        const diaristaStats = aggregate(i => i.diaristaId, i => i.diarista?.nome)
        const postoStats = aggregate(i => i.postoId, i => i.posto?.nome)
        const motivoStats = aggregate(i => i.motivoId, i => i.motivo?.descricao)
        // Add Colaborador (Reserva) Stats
        const colaboradorStats = aggregate(i => i.reservaId, i => i.reserva?.nome)

        const totalValue = items.reduce((acc, item) => acc + (Number(item.valor) || 0), 0)

        return NextResponse.json({
            diaristaStats,
            postoStats,
            motivoStats,
            colaboradorStats,
            totalValue
        })

    } catch (error) {
        console.error("[Stats API Error]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
