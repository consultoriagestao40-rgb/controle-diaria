import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: List PAID items with filters and full history
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN' && user.role !== 'APROVADOR_N2' && user.role !== 'APROVADOR_N1' && user.role !== 'RH') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const start = searchParams.get("start")
        const end = searchParams.get("end")
        const search = searchParams.get("search")

        const whereCondition: any = {
            status: 'PAGO'
        }

        if (start && end) {
            whereCondition.dataPagamento = {
                gte: new Date(start),
                lte: new Date(`${end}T23:59:59.999Z`)
            }
        }

        if (search && search.trim() !== "") {
            const cleanSearch = search.trim()
            whereCondition.OR = [
                { diarista: { nome: { contains: cleanSearch, mode: 'insensitive' } } },
                { diarista: { cpf: { contains: cleanSearch, mode: 'insensitive' } } },
                { posto: { nome: { contains: cleanSearch, mode: 'insensitive' } } },
                { justificativaPagamento: { contains: cleanSearch, mode: 'insensitive' } }
            ]
        }

        const historico = await prisma.cobertura.findMany({
            where: whereCondition,
            include: {
                posto: true,
                diarista: true,
                meioPagamentoEfetivado: true,
                financeiro: { select: { nome: true } },
                anexos: true // To show receipt link
            },
            orderBy: { dataPagamento: 'desc' },
            take: 500 // Expanded limit for complete history
        })

        return NextResponse.json(historico)
    } catch (error) {
        console.error("[FINANCE HISTORY ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
