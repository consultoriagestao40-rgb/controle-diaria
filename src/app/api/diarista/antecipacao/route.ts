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

        // Busca a taxa de antecipação configurada no sistema (ou 5.0% padrão)
        const config = await prisma.configuracaoAuditoria.findFirst({
            where: { ativo: true }
        })
        const taxaPercentual = config?.taxaAntecipacaoPercentual ?? 5.0

        const valorOriginal = Number(cobertura.valor)
        const taxaServico = Number((valorOriginal * (taxaPercentual / 100)).toFixed(2))
        const valorSolicitado = Number((valorOriginal - taxaServico).toFixed(2))

        const antecipacao = await prisma.solicitacaoAntecipacao.create({
            data: {
                coberturaId,
                diaristaId,
                valorOriginal,
                valorSolicitado,
                taxaServico,
                status: "PENDENTE",
                justificativa: justificativa || `Solicitação de antecipação com taxa de ${taxaPercentual}%`
            }
        })

        return NextResponse.json({
            success: true,
            message: `Solicitação de antecipação enviada com sucesso! Valor original: R$ ${valorOriginal.toFixed(2)} | Taxa (${taxaPercentual}%): -R$ ${taxaServico.toFixed(2)} | Líquido no Pix: R$ ${valorSolicitado.toFixed(2)}`,
            antecipacao: {
                ...antecipacao,
                valorOriginal,
                valorSolicitado,
                taxaServico,
                taxaPercentual
            }
        })

    } catch (error: any) {
        console.error("[ANTECIPACAO ERROR]", error)
        return NextResponse.json({ error: "Erro ao solicitar antecipação." }, { status: 500 })
    }
}
