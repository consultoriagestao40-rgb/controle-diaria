import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    const { id } = await params

    const allowedRoles = ['ADMIN', 'APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2', 'FINANCEIRO']
    if (!allowedRoles.includes(user.role)) {
        return NextResponse.json({ error: "Você não possui permissão para aprovar pedidos de compra." }, { status: 403 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const justificativaAprovacao = body.justificativaAprovacao || "Pedido de compra aprovado."

        const pedido = await prisma.pedidoCompra.findUnique({
            where: { id }
        })

        if (!pedido) {
            return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
        }

        const updated = await prisma.pedidoCompra.update({
            where: { id },
            data: {
                status: 'APROVADO',
                aprovadorId: user.id,
                dataAprovacao: new Date(),
                justificativaAprovacao,
                historico: {
                    create: {
                        deStatus: pedido.status,
                        paraStatus: 'APROVADO',
                        usuarioId: user.id,
                        observacao: `Aprovado por ${user.name || user.email}. Parecer: ${justificativaAprovacao}`
                    }
                }
            },
            include: {
                itens: true,
                solicitante: true,
                aprovador: true
            }
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("Erro ao aprovar pedido de compra:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
