import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const { coberturaId, diaristaId, justificativa } = await req.json()

        if (!coberturaId || !diaristaId) {
            return NextResponse.json({ error: "coberturaId e diaristaId são obrigatórios." }, { status: 400 })
        }

        const cobertura = await prisma.cobertura.findUnique({
            where: { id: coberturaId },
            include: { ponto: true, antecipacoes: true }
        })

        if (!cobertura) {
            return NextResponse.json({ error: "Cobertura não encontrada." }, { status: 404 })
        }

        if (cobertura.status === "PAGO") {
            return NextResponse.json({ error: "Esta diária já foi paga." }, { status: 400 })
        }

        // Verifica se já existe solicitação pendente
        const jaSolicitado = cobertura.antecipacoes.some(a => a.status === "PENDENTE")
        if (jaSolicitado) {
            return NextResponse.json({ error: "Já existe uma solicitação de antecipação pendente para esta diária." }, { status: 400 })
        }

        const valor = Number(cobertura.valor)

        const antecipacao = await prisma.solicitacaoAntecipacao.create({
            data: {
                coberturaId,
                diaristaId,
                valorOriginal: valor,
                valorSolicitado: valor,
                taxaServico: 0,
                status: "PENDENTE",
                justificativa: justificativa || "Solicitação de antecipação via Portal do Diarista"
            }
        })

        return NextResponse.json({
            success: true,
            message: "Solicitação de antecipação enviada com sucesso! O supervisor/financeiro analisará em breve.",
            antecipacao
        })

    } catch (error: any) {
        console.error("[ANTECIPACAO ERROR]", error)
        return NextResponse.json({ error: "Erro ao solicitar antecipação." }, { status: 500 })
    }
}
