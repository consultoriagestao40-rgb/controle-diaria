import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const centros = await prisma.centroCusto.findMany({
            include: {
                aprovadorN1: {
                    select: { id: true, nome: true, email: true }
                },
                aprovadorN2: {
                    select: { id: true, nome: true, email: true }
                },
                financeiro: {
                    select: { id: true, nome: true, email: true }
                },
                _count: {
                    select: { users: true, despesas: true }
                }
            },
            orderBy: { nome: 'asc' }
        })
        return NextResponse.json(centros)
    } catch (error) {
        console.error("Erro ao listar centros de custo:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { nome, aprovadorN1Id, aprovadorN2Id, financeiroId, ativo } = body

        if (!nome) {
            return new NextResponse(
                JSON.stringify({ error: "O nome do Centro de Custo é obrigatório." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const exists = await prisma.centroCusto.findUnique({ where: { nome } })
        if (exists) {
            return new NextResponse(
                JSON.stringify({ error: "Já existe um Centro de Custo com este nome." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const centro = await prisma.centroCusto.create({
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

        return NextResponse.json(centro)
    } catch (error) {
        console.error("Erro ao criar centro de custo:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
