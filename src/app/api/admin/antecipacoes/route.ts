import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Listar antecipações + configurações de taxa e vencimentos
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

        const config = await prisma.configuracaoAuditoria.findFirst({
            where: { ativo: true }
        })

        return NextResponse.json({
            antecipacoes,
            taxaPercentual: config?.taxaAntecipacaoPercentual ?? 5.0,
            politicaVencimentoTipo: config?.politicaVencimentoTipo ?? "TODA_SEXTA",
            politicaVencimentoDias: config?.politicaVencimentoDias ?? 7
        })
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar antecipações." }, { status: 500 })
    }
}

// Salvar ações ou configurações de taxa e política de vencimento
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { antecipacaoId, acao, justificativa, novaTaxaPercentual, politicaVencimentoTipo, politicaVencimentoDias } = body

        // Se for atualização de configurações (taxa ou vencimento)
        if (novaTaxaPercentual !== undefined || politicaVencimentoTipo !== undefined) {
            const configExistente = await prisma.configuracaoAuditoria.findFirst({ where: { ativo: true } })

            const updateData: any = {}
            if (novaTaxaPercentual !== undefined) updateData.taxaAntecipacaoPercentual = Number(novaTaxaPercentual)
            if (politicaVencimentoTipo !== undefined) updateData.politicaVencimentoTipo = politicaVencimentoTipo
            if (politicaVencimentoDias !== undefined) updateData.politicaVencimentoDias = Number(politicaVencimentoDias)

            if (configExistente) {
                await prisma.configuracaoAuditoria.update({
                    where: { id: configExistente.id },
                    data: updateData
                })
            } else {
                await prisma.configuracaoAuditoria.create({
                    data: {
                        palavrasProibidas: "cerveja,energetico,bebida",
                        taxaAntecipacaoPercentual: Number(novaTaxaPercentual ?? 5.0),
                        politicaVencimentoTipo: politicaVencimentoTipo ?? "TODA_SEXTA",
                        politicaVencimentoDias: Number(politicaVencimentoDias ?? 7)
                    }
                })
            }

            return NextResponse.json({ success: true, message: "Políticas e taxas salvas com sucesso!" })
        }

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

            // Atualiza status da cobertura para APROVADO mantendo o valor bruto original
            await prisma.cobertura.update({
                where: { id: antecipacao.coberturaId },
                data: {
                    status: "APROVADO"
                }
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
        return NextResponse.json({ error: "Erro ao processar solicitação." }, { status: 500 })
    }
}
