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
        meios
    })
} catch (error) {
    console.error(error)
    return new NextResponse("Internal Error", { status: 500 })
}
}
