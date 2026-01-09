import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next 15+
) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { id } = await params
        const body = await req.json()
        const { nome, ativo } = body

        const posto = await prisma.posto.update({
            where: { id },
            data: { nome, ativo }
        })

        return NextResponse.json(posto)
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
        // TODO: Check for usage in Cobertura before deleting? 
        // For V1, let's assume standard Delete. If FK constraint fails, Prisma throws.
        await prisma.posto.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error (or FK constraint)", { status: 500 })
    }
}
