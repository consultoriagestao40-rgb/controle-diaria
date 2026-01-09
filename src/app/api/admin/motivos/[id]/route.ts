import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { id } = await params
        const body = await req.json()
        const { descricao, ativo } = body

        const motivo = await prisma.motivo.update({
            where: { id },
            data: { descricao, ativo }
        })

        return NextResponse.json(motivo)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const role = (session.user as any).role
    if (role !== 'ADMIN' && role !== 'SUPERVISOR') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { id } = await params
        await prisma.motivo.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
