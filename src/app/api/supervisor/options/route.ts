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

        // 4. Reservas (Quem foi coberto) - Fallback
        let reservasFn = await prisma.reserva.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })
        if (reservasFn.length === 0) {
            reservasFn = [
                { id: "STATIC_BANCO", nome: "Banco de Reservas" }
            ] as any
        }

        // 5. Cargas Horarias (Mock for now if DB empty, or seed? Assuming DB might be empty, I'll return static if empty)
        // Actually let's assume we need to seed CargaHoraria roughly. I will check DB or just return static for V1 if simpler.
        // Let's query DB. If empty, client can fallback or we return defaults.
        // 5. Cargas Horarias - Fallback if empty
        let cargasFn = await prisma.cargaHoraria.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })
        if (cargasFn.length === 0) {
            // Return defaults if DB is empty to avoid blocking usage
            cargasFn = [
                { id: "STATIC_06", descricao: "06:00", ativo: true },
                { id: "STATIC_08", descricao: "08:00", ativo: true },
                { id: "STATIC_09", descricao: "09:00", ativo: true },
                { id: "STATIC_12", descricao: "12:00", ativo: true },
            ] as any
        }

        // 6. Meios Pagamento - Fallback if empty
        let meiosFn = await prisma.meioPagamento.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })
        if (meiosFn.length === 0) {
            meiosFn = [
                { id: "STATIC_PIX", descricao: "PIX", ativo: true },
                { id: "STATIC_DIN", descricao: "Dinheiro", ativo: true },
                { id: "STATIC_TRA", descricao: "Transferência", ativo: true },
            ] as any
        }

        const [postos, diaristas, motivos, reservas] = await Promise.all([
            postosFn, diaristasFn, motivosFn, reservasFn
        ])

        // Cargas and Meios were already awaited above to check for length
        const cargas = cargasFn
        const meios = meiosFn

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
