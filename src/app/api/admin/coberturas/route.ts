import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: List ALL items for Admin
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const coberturas = await prisma.cobertura.findMany({
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
            take: 200 // Limit for safety in V1
        })

        return NextResponse.json(coberturas)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
