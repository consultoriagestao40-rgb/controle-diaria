import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        await prisma.user.updateMany({ where: { email: 'admin@example.com' }, data: { nome: 'Cristiano Silva' } })
        await prisma.user.updateMany({ where: { email: 'supervisor@example.com' }, data: { nome: 'José Santos' } })
        await prisma.user.updateMany({ where: { email: 'aprovador@example.com' }, data: { nome: 'Roberto Gerente' } })
        await prisma.user.updateMany({ where: { email: 'financeiro@example.com' }, data: { nome: 'Ana Finanças' } })

        return NextResponse.json({ success: true })
    } catch (error) {
        return new NextResponse("Error", { status: 500 })
    }
}
