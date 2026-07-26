import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Listar todas as solicitações de antecipação
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const antecipacoes = await prisma.solicitacaoAntecipacao.findMany({
            include: {
                diarista: true,
                cobertura: {
                    include: {
                        posto: true,
                        ponto: true
                    }
                }
            },
            orderBy: { solicitadoEm: "desc" }
        })

        return NextResponse.json(antecipacoes)
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar antecipações." }, { status: 500 })
    }
}

// Aprovar ou Reprovar antecipação
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { antecipacaoId, acao, justificativa } = await req.json()

        if (!antecipacaoId || !acao) {
            return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
        }

        const antecipacao = await prisma.solicitacaoAntecipacao.findUnique({
            where: { id: antecipacaoId },
            include: { cobertura: true }
        })

        if (!antecipacao) {
            return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 })
        }

        if (acao === "APROVAR") {
            const atualizada = await prisma.solicitacaoAntecipacao.update({
                where: { id: antecipacaoId },
                data: {
                    status: "APROVADO",
                    aprovadoEm: new Date(),
                    justificativa: justificativa || "Antecipação aprovada pelo gestor"
                }
            })

            // Atualiza status da cobertura para APROVADO para agilizar pagamento no financeiro
            await prisma.cobertura.update({
                where: { id: antecipacao.coberturaId },
                data: { status: "APROVADO" }
            })

            return NextResponse.json({ success: true, antecipacao: atualizada })
        }

        if (acao === "REPROVAR") {
            const atualizada = await prisma.solicitacaoAntecipacao.update({
                where: { id: antecipacaoId },
                data: {
                    status: "REPROVADO",
                    justificativa: justificativa || "Antecipação reprovada pelo gestor"
                }
            })

            return NextResponse.json({ success: true, antecipacao: atualizada })
        }

        return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 })

    } catch (error) {
        return NextResponse.json({ error: "Erro ao processar antecipação." }, { status: 500 })
    }
}
