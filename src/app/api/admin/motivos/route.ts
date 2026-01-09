import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const motivos = await prisma.motivo.findMany({
            orderBy: { descricao: 'asc' }
        })
        return NextResponse.json(motivos)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { descricao, ativo } = body

        if (!descricao) return new NextResponse("Descricao is required", { status: 400 })

        const motivo = await prisma.motivo.create({
            data: {
                descricao,
                ativo: ativo !== undefined ? ativo : true
            }
        })

        return NextResponse.json(motivo)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
