import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'FINANCEIRO')) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const supervisores = await prisma.user.findMany({
            where: { role: 'SUPERVISOR' },
            include: {
                postosAutorizados: true
            },
            orderBy: { nome: 'asc' }
        })
        return NextResponse.json(supervisores)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { nome, email, password, postosIds, ativo } = body

        if (!nome || !email || !password) {
            return new NextResponse("Missing fields", { status: 400 })
        }

        const exists = await prisma.user.findUnique({ where: { email } })
        if (exists) return new NextResponse("Email already exists", { status: 400 })

        const user = await prisma.user.create({
            data: {
                nome,
                email,
                password, // TODO: Hash in V2
                role: 'SUPERVISOR',
                ativo: ativo !== undefined ? ativo : true,
                postosAutorizados: {
                    connect: postosIds?.map((id: string) => ({ id })) || []
                }
            },
            include: {
                postosAutorizados: true
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
