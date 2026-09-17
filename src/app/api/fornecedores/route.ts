import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() || ""

    try {
        const whereClause: any = { ativo: true }
        if (q) {
            whereClause.OR = [
                { nome: { contains: q, mode: "insensitive" } },
                { cnpj: { contains: q.replace(/\D/g, "") } },
                { cnpj: { contains: q, mode: "insensitive" } }
            ]
        }

        const fornecedores = await prisma.fornecedor.findMany({
            where: whereClause,
            orderBy: { nome: "asc" },
            take: 50
        })

        return NextResponse.json(fornecedores)
    } catch (err: any) {
        console.error("Erro ao buscar fornecedores:", err)
        return NextResponse.json({ error: "Falha ao buscar fornecedores" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const {
            nome,
            cnpj,
            email,
            telefone,
            contato,
            condicoesPagamento,
            chavePix,
            dadosBancarios
        } = body

        if (!nome || !nome.trim()) {
            return NextResponse.json({ error: "Nome/Razão Social é obrigatório." }, { status: 400 })
        }

        const cleanNome = nome.trim()
        const cleanCnpj = cnpj?.trim() || null

        // Tenta encontrar por CNPJ ou nome exato
        let existing = null
        if (cleanCnpj) {
            existing = await prisma.fornecedor.findFirst({
                where: { cnpj: cleanCnpj }
            })
        }
        if (!existing) {
            existing = await prisma.fornecedor.findFirst({
                where: { nome: { equals: cleanNome, mode: "insensitive" } }
            })
        }

        if (existing) {
            const updated = await prisma.fornecedor.update({
                where: { id: existing.id },
                data: {
                    nome: cleanNome,
                    cnpj: cleanCnpj || existing.cnpj,
                    email: email?.trim() || existing.email,
                    telefone: telefone?.trim() || existing.telefone,
                    contato: contato?.trim() || existing.contato,
                    condicoesPagamento: condicoesPagamento?.trim() || existing.condicoesPagamento,
                    chavePix: chavePix?.trim() || existing.chavePix,
                    dadosBancarios: dadosBancarios?.trim() || existing.dadosBancarios,
                    ativo: true
                }
            })
            return NextResponse.json(updated)
        }

        const created = await prisma.fornecedor.create({
            data: {
                nome: cleanNome,
                cnpj: cleanCnpj,
                email: email?.trim() || null,
                telefone: telefone?.trim() || null,
                contato: contato?.trim() || null,
                condicoesPagamento: condicoesPagamento?.trim() || null,
                chavePix: chavePix?.trim() || null,
                dadosBancarios: dadosBancarios?.trim() || null,
                ativo: true
            }
        })

        return NextResponse.json(created)
    } catch (err: any) {
        console.error("Erro ao salvar fornecedor:", err)
        return NextResponse.json({ error: "Falha ao salvar fornecedor" }, { status: 500 })
    }
}
