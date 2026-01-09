import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const diaristas = await prisma.diarista.findMany({
            orderBy: { nome: 'asc' }
        })
        return NextResponse.json(diaristas)
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
        const { nome, cpf, ativo } = body

        if (!nome || !cpf) return new NextResponse("Nome and CPF are required", { status: 400 })

        const diarista = await prisma.diarista.create({
            data: {
                nome,
                cpf,
                chavePix: body.chavePix,
                ativo: ativo !== undefined ? ativo : true
            }
        })

        return NextResponse.json(diarista)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
