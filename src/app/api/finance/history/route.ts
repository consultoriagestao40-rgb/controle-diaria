import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: List PAID items
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const historico = await prisma.cobertura.findMany({
            where: { status: 'PAGO' },
            include: {
                posto: true,
                diarista: true,
                meioPagamentoEfetivado: true,
                financeiro: { select: { nome: true } },
                anexos: true // To show receipt link
            },
            orderBy: { dataPagamento: 'desc' },
            take: 50 // Limit for V1
        })

        return NextResponse.json(historico)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
