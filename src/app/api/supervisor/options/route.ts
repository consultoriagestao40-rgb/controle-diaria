import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    // Allow all roles that need options (Supervisor, Admin, Financeiro, Encarregado)
    // Actually, Financeiro uses admin/reports which calls admin/options (usually), but let's be safe.
    // If this API is used by Financeiro's report filters (which I saw earlier uses /api/supervisor/options), add them.
    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN' && user.role !== 'ENCARREGADO' && user.role !== 'FINANCEIRO') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        // 1. Postos
        const postosFn = prisma.posto.findMany({
            where: user.role === 'ADMIN' ? { ativo: true } : {
                ativo: true,
                supervisores: { some: { id: user.id } }
            },
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

        // 4. Reservas - Auto-seed if empty
        let reservasCount = await prisma.reserva.count({ where: { ativo: true } })
        if (reservasCount === 0) {
            await prisma.reserva.create({
                data: { nome: "Banco de Reservas", cpf: "000.000.000-00", ativo: true }
            })
        }
        const reservasFn = prisma.reserva.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        // 5. Cargas Horarias - Auto-seed
        let cargasCount = await prisma.cargaHoraria.count({ where: { ativo: true } })
        if (cargasCount === 0) {
            await prisma.cargaHoraria.createMany({
                data: [
                    { descricao: "06:00" },
                    { descricao: "08:00" },
                    { descricao: "09:00" },
                    { descricao: "12:00" }
                ]
            })
        }
        const cargasFn = prisma.cargaHoraria.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })

        // 6. Meios Pagamento - Auto-seed
        let meiosCount = await prisma.meioPagamento.count({ where: { ativo: true } })
        if (meiosCount === 0) {
            await prisma.meioPagamento.createMany({
                data: [
                    { descricao: "PIX" },
                    { descricao: "Dinheiro" },
                    { descricao: "Transferência" }
                ]
            })
        }
        const meiosFn = prisma.meioPagamento.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })

        // 7. Empresas
        const empresasFn = prisma.empresa.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            select: { id: true, nome: true }
        })

        const [postos, diaristas, motivos, reservas, cargas, meios, empresas] = await Promise.all([
            postosFn, diaristasFn, motivosFn, reservasFn, cargasFn, meiosFn, empresasFn
        ])

        return NextResponse.json({
            postos,
            diaristas,
            motivos,
            reservas,
            cargas,
            meios,
            empresas
        })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
