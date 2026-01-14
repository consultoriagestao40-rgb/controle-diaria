import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const empresas = await prisma.empresa.findMany({
            orderBy: { nome: 'asc' }
        })
        return NextResponse.json(empresas)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const role = (session.user as any).role
    if (role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { nome, ativo } = body

        if (!nome) return new NextResponse("Nome is required", { status: 400 })

        const empresa = await prisma.empresa.create({
            data: {
                nome,
                ativo: ativo !== undefined ? ativo : true
            }
        })

        return NextResponse.json(empresa)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
