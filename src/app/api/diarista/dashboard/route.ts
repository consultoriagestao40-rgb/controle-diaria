import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

        // Busca todas as coberturas ativas do diarista
        const coberturas = await prisma.cobertura.findMany({
            where: {
                diaristaId: diaristaId
            },
            include: {
                posto: true,
                ponto: true,
                antecipacoes: true
            },
            orderBy: {
                data: "desc"
            }
        })

        // Data de hoje (sem hora)
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        // Plantão de hoje com Check-in
        const plantaoHoje = coberturas.find(c => {
            const dataCob = new Date(c.data)
            dataCob.setHours(0, 0, 0, 0)
            return dataCob.getTime() === hoje.getTime()
        })

        // Cálculos Financeiros
        let saldoDisponivel = 0 // Concluídos com Check-out ou Aprovados/Pagos
        let saldoAReceber = 0    // Em andamento ou Pendente
        let totalJaPago = 0

        coberturas.forEach(c => {
            const valorNum = Number(c.valor)
            if (c.status === "PAGO") {
                totalJaPago += valorNum
            } else if (c.status === "APROVADO" || (c.ponto && c.ponto.status === "CONCLUIDO")) {
                saldoDisponivel += valorNum
            } else if (c.status === "PENDENTE" || c.status === "APROVADO_N1") {
                saldoAReceber += valorNum
            }
        })

        // Histórico de antecipações ativas/pendentes
        const antecipacoes = await prisma.solicitacaoAntecipacao.findMany({
            where: { diaristaId },
            include: { cobertura: { include: { posto: true } } },
            orderBy: { solicitadoEm: "desc" }
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
                disponivel: saldoDisponivel,
                aReceber: saldoAReceber,
                jaPago: totalJaPago
            },
            plantaoHoje: plantaoHoje ? {
                id: plantaoHoje.id,
                postoNome: plantaoHoje.posto.nome,
                postoLat: plantaoHoje.posto.latitude,
                postoLng: plantaoHoje.posto.longitude,
                postoRaio: plantaoHoje.posto.raioMetros || 200,
                valor: Number(plantaoHoje.valor),
                data: plantaoHoje.data,
                horaInicio: plantaoHoje.horaInicio,
                horaFim: plantaoHoje.horaFim,
                ponto: plantaoHoje.ponto
            } : null,
            historico: coberturas.map(c => ({
                id: c.id,
                data: c.data,
                postoNome: c.posto.nome,
                valor: Number(c.valor),
                status: c.status,
                pontoStatus: c.ponto?.status || null,
                pontoCheckInAt: c.ponto?.checkInAt || null,
                pontoCheckOutAt: c.ponto?.checkOutAt || null,
                podeAntecipar: (c.ponto?.status === "CONCLUIDO" || c.status === "APROVADO") && c.status !== "PAGO"
            })),
            antecipacoes: antecipacoes.map(a => ({
                id: a.id,
                coberturaId: a.coberturaId,
                postoNome: a.cobertura.posto.nome,
                valorOriginal: Number(a.valorOriginal),
                valorSolicitado: Number(a.valorSolicitado),
                status: a.status,
                solicitadoEm: a.solicitadoEm
            }))
        })

    } catch (error: any) {
        console.error("[DIARISTA DASHBOARD ERROR]", error)
        return NextResponse.json({ error: "Erro ao buscar dashboard do diarista." }, { status: 500 })
    }
}
