import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { id } = await params

    try {
        const pedido = await prisma.pedidoCompra.findUnique({
            where: { id },
            include: {
                solicitante: {
                    select: { id: true, nome: true, email: true, role: true, cargo: true }
                },
                comprador: {
                    select: { id: true, nome: true, email: true, role: true }
                },
                aprovador: {
                    select: { id: true, nome: true, email: true, role: true }
                },
                itens: {
                    orderBy: { createdAt: 'asc' }
                },
                historico: {
                    include: {
                        usuario: {
                            select: { id: true, nome: true, email: true }
                        }
                    },
                    orderBy: { data: 'desc' }
                }
            }
        })

        if (!pedido) {
            return NextResponse.json({ error: "Pedido de compra não encontrado." }, { status: 404 })
        }

        return NextResponse.json(pedido)
    } catch (error: any) {
        console.error("Erro ao obter pedido de compra:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
