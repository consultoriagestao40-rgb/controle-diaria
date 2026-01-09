import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { id } = await params
        const body = await req.json()
        const { nome, cpf, ativo } = body

        const reserva = await prisma.reserva.update({
            where: { id },
            data: { nome, cpf, ativo }
        })

        return NextResponse.json(reserva)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { id } = await params
        await prisma.reserva.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
