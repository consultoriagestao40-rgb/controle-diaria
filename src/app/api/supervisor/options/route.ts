import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any

    try {
        // 1. Postos: If admin, all. If supervisor, only authorized.
        const postosFn = prisma.posto.findMany({
            where: user.role === 'ADMIN' ? { ativo: true } : {
                ativo: true,
                supervisores: { some: { id: user.id } }
            },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 2. Diaristas
        const diaristasFn = prisma.diarista.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 3. Motivos
        const motivosFn = prisma.motivo.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' },
            select: { id: true, descricao: true }
        })

        // 4. Reservas (Quem foi coberto)
        const reservasFn = prisma.reserva.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 5. Cargas Horarias (Mock for now if DB empty, or seed? Assuming DB might be empty, I'll return static if empty)
        // Actually let's assume we need to seed CargaHoraria roughly. I will check DB or just return static for V1 if simpler.
        // Let's query DB. If empty, client can fallback or we return defaults.
        const cargasFn = prisma.cargaHoraria.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })

        // 6. Meios Pagamento (Solicitado)
        const meiosFn = prisma.meioPagamento.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })

        const [postos, diaristas, motivos, reservas, cargas, meios] = await Promise.all([
            postosFn, diaristasFn, motivosFn, reservasFn, cargasFn, meiosFn
        ])

        return NextResponse.json({
            postos,
            diaristas,
            motivos,
            reservas,
            cargas,
            meios
        })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
