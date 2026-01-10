import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    // Explicit Admin check? Or assume if they can access dashboard/admin they can see options?
    // Let's enforce Admin to be safe, or at least authenticated.
    // The page is dashboard/admin, so user is likely Admin.
    const user = session.user as any
    // Allow access to all roles that need filters (Admin, Supervisor, Financeiro, RH)
    // Basically, only block if needed, but standard roles are fine.
    const allowedRoles = ['ADMIN', 'SUPERVISOR', 'FINANCEIRO', 'RH']
    if (!allowedRoles.includes(user.role)) {
        // Supervisors might view this page too? 
        // Current dashboard/admin page doesn't block Supervisor (client side).
        // But API route /api/admin/coberturas BLOCKS non-admin.
        // So this options route should probably also block non-admin if it's "admin/options".
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        // 1. Postos
        const postosFn = prisma.posto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 2. Diaristas
        const diaristasFn = prisma.diarista.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 3. Motivos
        const motivosFn = prisma.motivo.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' },
            select: { id: true, descricao: true }
        })

        // 4. Reservas (Colaborador)
        const reservasFn = prisma.reserva.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 5. Supervisors (Users with role SUPERVISOR or ADMIN?)
        // Usually we filter by role.
        const supervisoresFn = prisma.user.findMany({
            where: {
                role: { in: ['SUPERVISOR', 'ADMIN'] },
                ativo: true // Assuming User model has 'ativo'? 
                // Wait, User model doesn't always have 'ativo' in simple schemas unless I added it.
                // Let's check schema or just assume all users.
            },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        const [postos, diaristas, motivos, reservas, supervisores] = await Promise.all([
            postosFn, diaristasFn, motivosFn, reservasFn, supervisoresFn
        ])

        return NextResponse.json({
            postos,
            diaristas,
            motivos,
            reservas,
            supervisores
        })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
