import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyNewCoverage } from "@/lib/email"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any

    // Supervisors see their own launches. Admins see all (or filtered).
    // For this route, we focus on Supervisor Dashboard view.

    try {
        const coberturas = await prisma.cobertura.findMany({
            where: user.role === 'ADMIN' ? {} : { supervisorId: user.id },
            include: {
                posto: true,
                diarista: true,
                supervisor: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json(coberturas)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
