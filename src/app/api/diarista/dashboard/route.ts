import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Calcula a data de vencimento prevista para o pagamento da diária
function calcularVencimento(dataCob: Date, tipo: string, dias: number): Date {
    const venc = new Date(dataCob)
    if (tipo === "TODA_SEXTA") {
        const dayOfWeek = venc.getDay()
        let distanceToFriday = 5 - dayOfWeek
        if (distanceToFriday <= 0) distanceToFriday += 7
        venc.setDate(venc.getDate() + distanceToFriday)
    } else {
        venc.setDate(venc.getDate() + (dias || 7))
    }
    return venc
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const diaristaId = searchParams.get("diaristaId")

        if (!diaristaId) {
            return NextResponse.json({ error: "diaristaId é obrigatório." }, { status: 400 })
        }

        const diarista = await prisma.diarista.findUnique({
            where: { id: diaristaId }
        })

        if (!diarista) {
            return NextResponse.json({ error: "Diarista não encontrado." }, { status: 404 })
        }

        // Busca configuração de vencimento e taxa
        const config = await prisma.configuracaoAuditoria.findFirst({ where: { ativo: true } })
        const tipoVencimento = config?.politicaVencimentoTipo || "TODA_SEXTA"
        const diasVencimento = config?.politicaVencimentoDias || 7
        const taxaPercentual = config?.taxaAntecipacaoPercentual || 5.0

        // Busca todas as coberturas ativas do diarista
        const coberturas = await prisma.cobertura.findMany({
            where: { diaristaId: diaristaId },
            include: {
                posto: true,
                ponto: true,
                antecipacoes: true
            },
            orderBy: { data: "desc" }
        })

        // Data de hoje
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        // Plantão de hoje
        const plantaoHoje = coberturas.find(c => {
            const dataCob = new Date(c.data)
            dataCob.setHours(0, 0, 0, 0)
            return dataCob.getTime() === hoje.getTime()
        })

        // Totais da visão financeira do prestador
        let totalSacado = 0     // Já recebeu no Pix (PAGO)
        let totalAVencer = 0    // Aprovado / Ponto feito, mas com vencimento futuro (Pode antecipar)
        let totalEmAnalise = 0  // Finalizou plantão ou pendente, mas supervisor/N1/N2 não validou ainda

        coberturas.forEach(c => {
            const valorNum = Number(c.valor)
            if (c.status === "PAGO") {
                totalSacado += valorNum
            } else if (c.status === "APROVADO" || (c.ponto && c.ponto.status === "CONCLUIDO")) {
                totalAVencer += valorNum
            } else {
                totalEmAnalise += valorNum
            }
        })

        const antecipacoes = await prisma.solicitacaoAntecipacao.findMany({
            where: { diaristaId },
            include: { cobertura: { include: { posto: true } } },
            orderBy: { solicitadoEm: "desc" }
        })

        // Monta o extrato em formato de linha a linha bancário
        const extrato = coberturas.map(c => {
            const venc = c.dataVencimento || calcularVencimento(new Date(c.data), tipoVencimento, diasVencimento)
            const antecipacaoPendente = c.antecipacoes.find(a => a.status === "PENDENTE")

            let statusExtrato = "EM_ANALISE" // PENDENTE ou APROVADO_N1 sem validacao final
            let statusExtratoRotulo = "Em Análise"

            if (c.status === "PAGO") {
                statusExtrato = "RECEBIDO"
                statusExtratoRotulo = "Recebido"
            } else if (antecipacaoPendente) {
                statusExtrato = "ANTECIPACAO_SOLICITADA"
                statusExtratoRotulo = "Antecipação Solicitada"
            } else if (c.status === "APROVADO" || (c.ponto && c.ponto.status === "CONCLUIDO")) {
                statusExtrato = "A_VENCER"
                statusExtratoRotulo = "Aprovado (A Vencer)"
            }

            return {
                id: c.id,
                dataPlantao: c.data,
                dataVencimento: venc,
                postoNome: c.posto.nome,
                valorBruto: Number(c.valor),
                taxaAntecipacao: Number((Number(c.valor) * (taxaPercentual / 100)).toFixed(2)),
                valorLiquidoAntecipado: Number((Number(c.valor) * (1 - taxaPercentual / 100)).toFixed(2)),
                statusExtrato,
                statusExtratoRotulo,
                pontoStatus: c.ponto?.status || null,
                podeAntecipar: statusExtrato === "A_VENCER"
            }
        })

        return NextResponse.json({
            diarista: {
                id: diarista.id,
                nome: diarista.nome,
                cpf: diarista.cpf,
                chavePix: diarista.chavePix,
                telefone: diarista.telefone
            },
            saldos: {
                totalSacado,
                totalAVencer,
                totalEmAnalise
            },
            configTaxa: taxaPercentual,
            politicaVencimento: {
                tipo: tipoVencimento,
                dias: diasVencimento,
                descricao: tipoVencimento === "TODA_SEXTA" ? "Pagamento todas as Sextas-feiras" : `Pagamento em D+${diasVencimento} dias após o plantão`
            },
            plantaoHoje: plantaoHoje ? {
                id: plantaoHoje.id,
                postoNome: plantaoHoje.posto.nome,
                postoLat: plantaoHoje.posto.latitude,
                postoLng: plantaoHoje.posto.longitude,
                postoRaio: plantaoHoje.posto.raioMetros || 200,
                valor: Number(plantaoHoje.valor),
                data: plantaoHoje.data,
                dataVencimento: plantaoHoje.dataVencimento || calcularVencimento(new Date(plantaoHoje.data), tipoVencimento, diasVencimento),
                horaInicio: plantaoHoje.horaInicio,
                horaFim: plantaoHoje.horaFim,
                ponto: plantaoHoje.ponto
            } : null,
            extrato
        })

    } catch (error: any) {
        console.error("[DIARISTA DASHBOARD ERROR]", error)
        return NextResponse.json({ error: "Erro ao buscar dashboard do diarista." }, { status: 500 })
    }
}
