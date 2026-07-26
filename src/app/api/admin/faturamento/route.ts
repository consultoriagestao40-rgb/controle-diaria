import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')
    const empresaId = searchParams.get('empresaId')
    const postoId = searchParams.get('postoId')

    try {
        // Busca a configuração global de auditoria e taxas
        let config = await prisma.configuracaoAuditoria.findFirst({
            where: { ativo: true }
        })

        if (!config) {
            config = await prisma.configuracaoAuditoria.create({
                data: {
                    palavrasProibidas: "cerveja,energetico,bebida",
                    taxaAntecipacaoPercentual: 5.0,
                    taxaServicoClientePercentual: 10.0,
                    politicaVencimentoTipo: "TODA_SEXTA",
                    politicaVencimentoDias: 7
                }
            })
        }

        const taxaServicoPercentual = config.taxaServicoClientePercentual ?? 10.0
        const taxaAntecipacaoPercentual = config.taxaAntecipacaoPercentual ?? 5.0

        // Filtro de Coberturas (Plantões)
        let where: any = {
            status: { in: ['APROVADO', 'PAGO'] }
        }

        if (startStr && endStr) {
            const startDate = new Date(startStr)
            const endDate = new Date(endStr)
            endDate.setHours(23, 59, 59, 999)
            where.data = { gte: startDate, lte: endDate }
        }

        if (empresaId && empresaId !== 'ALL') where.empresaId = empresaId
        if (postoId && postoId !== 'ALL') where.postoId = postoId

        const coberturas = await prisma.cobertura.findMany({
            where,
            include: {
                posto: true,
                diarista: true,
                reserva: true,
                motivo: true,
                empresa: true,
                ponto: true,
                antecipacoes: true
            },
            orderBy: { data: 'desc' }
        })

        // Processa cada plantão e calcula os totais de faturamento e taxas
        let totalDiariasBruto = 0
        let totalTaxaServicoCliente = 0
        let totalFaturaCliente = 0
        let totalCustoDiarista = 0
        let totalGanhoAntecipacao = 0
        let totalLucroPrestadora = 0

        const items = coberturas.map(c => {
            const valorDiaria = Number(c.valor || 0)
            const valorTaxaServico = Number((valorDiaria * (taxaServicoPercentual / 100)).toFixed(2))
            const valorFaturaCliente = Number((valorDiaria + valorTaxaServico).toFixed(2))

            // Verifica se o diarista antecipou essa diária
            const antecipacaoPaga = c.antecipacoes.find(a => a.status === 'PAGO' || a.status === 'APROVADO')
            const antecipada = !!antecipacaoPaga
            const taxaAntecipacaoRetida = antecipada
                ? Number(antecipacaoPaga.taxaServico || (valorDiaria * (taxaAntecipacaoPercentual / 100)).toFixed(2))
                : 0

            const valorPagoDiarista = antecipada
                ? Number((valorDiaria - taxaAntecipacaoRetida).toFixed(2))
                : valorDiaria

            const lucroPlantao = Number((valorTaxaServico + taxaAntecipacaoRetida).toFixed(2))

            totalDiariasBruto += valorDiaria
            totalTaxaServicoCliente += valorTaxaServico
            totalFaturaCliente += valorFaturaCliente
            totalCustoDiarista += valorPagoDiarista
            totalGanhoAntecipacao += taxaAntecipacaoRetida
            totalLucroPrestadora += lucroPlantao

            return {
                id: c.id,
                data: c.data,
                postoNome: c.posto.nome,
                empresaNome: c.empresa?.nome || "Cliente Padrão",
                diaristaNome: c.diarista.nome,
                reservaNome: c.reserva?.nome || "Vaga em Aberto",
                motivo: c.motivo.descricao,
                valorDiaria,
                taxaServicoPercentual,
                valorTaxaServico,
                valorFaturaCliente,
                antecipada,
                taxaAntecipacaoRetida,
                valorPagoDiarista,
                lucroPlantao,
                status: c.status,
                ponto: c.ponto
            }
        })

        return NextResponse.json({
            config: {
                taxaServicoClientePercentual: taxaServicoPercentual,
                taxaAntecipacaoPercentual: taxaAntecipacaoPercentual
            },
            totais: {
                qtdPlantoes: items.length,
                totalDiariasBruto,
                totalTaxaServicoCliente,
                totalFaturaCliente,
                totalCustoDiarista,
                totalGanhoAntecipacao,
                totalLucroPrestadora
            },
            items
        })

    } catch (error) {
        console.error("Erro ao buscar faturamento de clientes:", error)
        return NextResponse.json({ error: "Erro ao processar faturamento." }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { taxaServicoClientePercentual } = body

        if (taxaServicoClientePercentual === undefined) {
            return NextResponse.json({ error: "Taxa não fornecida." }, { status: 400 })
        }

        const configExistente = await prisma.configuracaoAuditoria.findFirst({ where: { ativo: true } })

        if (configExistente) {
            await prisma.configuracaoAuditoria.update({
                where: { id: configExistente.id },
                data: { taxaServicoClientePercentual: Number(taxaServicoClientePercentual) }
            })
        } else {
            await prisma.configuracaoAuditoria.create({
                data: {
                    palavrasProibidas: "cerveja,energetico",
                    taxaServicoClientePercentual: Number(taxaServicoClientePercentual),
                    taxaAntecipacaoPercentual: 5.0
                }
            })
        }

        return NextResponse.json({ success: true, message: "Taxa de Serviço do Cliente salva com sucesso!" })
    } catch (error) {
        return NextResponse.json({ error: "Erro ao salvar taxa de serviço." }, { status: 500 })
    }
}
