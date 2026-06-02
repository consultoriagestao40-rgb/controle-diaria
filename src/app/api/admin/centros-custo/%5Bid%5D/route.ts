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
        const { nome, aprovadorN1Id, aprovadorN2Id, financeiroId, ativo } = body

        if (!nome) {
            return new NextResponse(
                JSON.stringify({ error: "O nome do Centro de Custo é obrigatório." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Check if name is taken by another CentroCusto
        const taken = await prisma.centroCusto.findFirst({
            where: {
                nome,
                NOT: { id }
            }
        })
        if (taken) {
            return new NextResponse(
                JSON.stringify({ error: "Já existe outro Centro de Custo com este nome." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const updated = await prisma.centroCusto.update({
            where: { id },
            data: {
                nome,
                aprovadorN1Id: aprovadorN1Id || null,
                aprovadorN2Id: aprovadorN2Id || null,
                financeiroId: financeiroId || null,
                ativo: ativo !== undefined ? ativo : true
            },
            include: {
                aprovadorN1: {
                    select: { id: true, nome: true, email: true }
                },
                aprovadorN2: {
                    select: { id: true, nome: true, email: true }
                },
                financeiro: {
                    select: { id: true, nome: true, email: true }
                }
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Erro ao atualizar centro de custo:", error)
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

        // Check relations to prevent foreign key errors
        const centro = await prisma.centroCusto.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true, despesas: true }
                }
            }
        })

        if (!centro) {
            return new NextResponse(
                JSON.stringify({ error: "Centro de Custo não encontrado." }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }

        if (centro._count.users > 0 || centro._count.despesas > 0) {
            return new NextResponse(
                JSON.stringify({ error: "Não é possível excluir este Centro de Custo pois existem usuários ou despesas vinculados. Altere o status para Inativo em vez de excluir." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        await prisma.centroCusto.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Erro ao excluir centro de custo:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
