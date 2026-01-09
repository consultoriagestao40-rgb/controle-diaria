import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const count = await prisma.cobertura.count()
        const users = await prisma.user.count()
        const lastItems = await prisma.cobertura.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { supervisor: true, posto: true, diarista: true }
        })

        return NextResponse.json({
            status: "Online",
            total_coberturas: count,
            total_users: users,
            last_items: lastItems
        }, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
