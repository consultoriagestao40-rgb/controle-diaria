import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const carga = await prisma.cargaHoraria.findUnique({
            where: { id: params.id }
        })
        if (!carga) return new NextResponse("Not Found", { status: 404 })
        return NextResponse.json(carga)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { descricao, ativo } = body

        const carga = await prisma.cargaHoraria.update({
            where: { id: params.id },
            data: {
                descricao,
                ativo
            }
        })

        return NextResponse.json(carga)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        await prisma.cargaHoraria.delete({
            where: { id: params.id }
        })
        return new NextResponse(null, { status: 204 })
    } catch (error) {
        // Handle FK limit check
        return new NextResponse("Cannot delete used record", { status: 400 })
    }
}
