import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Retornar políticas e termos configurados
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const politicas = await prisma.politicaDespesa.findMany({
            orderBy: { categoria: 'asc' }
        })

        let auditoria = await prisma.configuracaoAuditoria.findFirst({
            where: { ativo: true }
        })

        if (!auditoria) {
            auditoria = await prisma.configuracaoAuditoria.create({
                data: {
                    palavrasProibidas: "cerveja,energetico,preservativo,chiclete,bala,doce,bebida"
                }
            })
        }

        return NextResponse.json({ politicas, auditoria })
    } catch (error) {
        console.error("Erro ao buscar políticas:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Criar ou Atualizar políticas de despesas e termos de auditoria (Apenas ADMIN)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const { tipoConfig, categoria, limiteValor, descricao, palavrasProibidas } = body

        if (tipoConfig === "AUDITORIA") {
            if (palavrasProibidas === undefined) {
                return new NextResponse(
                    JSON.stringify({ error: "Campo 'palavrasProibidas' é obrigatório para esta configuração." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            // Atualiza ou cria as configurações de palavras
            const current = await prisma.configuracaoAuditoria.findFirst({
                where: { ativo: true }
            })

            let result
            if (current) {
                result = await prisma.configuracaoAuditoria.update({
                    where: { id: current.id },
                    data: { palavrasProibidas }
                })
            } else {
                result = await prisma.configuracaoAuditoria.create({
                    data: { palavrasProibidas }
                })
            }

            return NextResponse.json(result)
        } else if (tipoConfig === "LIMITE") {
            if (!categoria || limiteValor === undefined || !descricao) {
                return new NextResponse(
                    JSON.stringify({ error: "Campos 'categoria', 'limiteValor' e 'descricao' são obrigatórios." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            const valor = parseFloat(limiteValor)
            if (isNaN(valor) || valor < 0) {
                return new NextResponse(
                    JSON.stringify({ error: "Limite de valor inválido." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            const result = await prisma.politicaDespesa.upsert({
                where: { categoria },
                update: { limiteValor: valor, descricao },
                create: { categoria, limiteValor: valor, descricao }
            })

            return NextResponse.json(result)
        } else {
            return new NextResponse(
                JSON.stringify({ error: "Tipo de configuração inválido. Use 'AUDITORIA' ou 'LIMITE'." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
    } catch (error) {
        console.error("Erro ao salvar política:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
