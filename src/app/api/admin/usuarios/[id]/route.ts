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
        const { nome, email, password, postosIds, ativo, role } = body

        // Prepare update data
        const data: any = {
            nome,
            email,
            ativo,
            role
        }

        if (password) data.password = password // Only update if provided

        // If postosIds is provided, update the relation
        if (postosIds) {
            data.postosAutorizados = {
                set: postosIds.map((pid: string) => ({ id: pid }))
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            include: {
                postosAutorizados: true
            }
        })

        return NextResponse.json(user)
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
        // Deleting a user might be dangerous due to foreign keys (Workflow history, etc.)
        // Better to soft delete (set ativo = false). But for CRUD requirement:

        // Check constraints? For now V1 standard delete or error if FK constraints fail.
        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Internal Error or FK Constraint", { status: 500 })
    }
}
