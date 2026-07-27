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
    const statusFaturamento = searchParams.get('statusFaturamento') || 'A_FATURAR' // A_FATURAR | FATURADAS | ALL

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

        if (statusFaturamento === 'A_FATURAR') {
            where.faturado = false
        } else if (statusFaturamento === 'FATURADAS') {
            where.faturado = true
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
                antecipacoes: true,
                faturaCliente: true
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
            const taxaAplicada = c.faturaCliente
                ? c.faturaCliente.taxaServicoPercentual
                : taxaServicoPercentual

            const valorTaxaServico = Number((valorDiaria * (taxaAplicada / 100)).toFixed(2))
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
                empresaId: c.empresaId,
                empresaNome: c.empresa?.nome || "Cliente Padrão",
                diaristaNome: c.diarista.nome,
                reservaNome: c.reserva?.nome || "Vaga em Aberto",
                motivo: c.motivo.descricao,
                valorDiaria,
                taxaServicoPercentual: taxaAplicada,
                valorTaxaServico,
                valorFaturaCliente,
                antecipada,
                taxaAntecipacaoRetida,
                valorPagoDiarista,
                lucroPlantao,
                status: c.status,
                faturado: c.faturado,
                faturaCliente: c.faturaCliente ? {
                    id: c.faturaCliente.id,
                    numeroFatura: c.faturaCliente.numeroFatura,
                    geradaEm: c.faturaCliente.createdAt,
                    status: c.faturaCliente.status
                } : null,
                ponto: c.ponto
            }
        })

        // Lista de Faturas já emitidas para consulta rápida e exibição da Tabela de Faturas
        const faturasEmitidas = await prisma.faturaCliente.findMany({
            include: {
                empresa: true,
                coberturas: {
                    include: {
                        posto: true,
                        diarista: true,
                        reserva: true,
                        motivo: true,
                        ponto: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
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
            items,
            faturasEmitidas
        })

    } catch (error) {
        console.error("Erro ao buscar faturamento de clientes:", error)
        return NextResponse.json({ error: "Erro ao processar faturamento." }, { status: 500 })
    }
}

// POST: Ações de Faturamento (Salvar Taxa ou Gerar Nova Fatura)
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { acao, taxaServicoClientePercentual, coberturaIds, empresaId, observacoes } = body

        // 1. Atualizar taxa global do cliente
        if (acao === 'SALVAR_TAXA' || taxaServicoClientePercentual !== undefined && !coberturaIds) {
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
        }

        // 2. Gerar Nova Fatura do Cliente com as diárias selecionadas
        if (acao === 'GERAR_FATURA' || (coberturaIds && coberturaIds.length > 0)) {
            if (!coberturaIds || coberturaIds.length === 0) {
                return NextResponse.json({ error: "Nenhuma diária selecionada para faturamento." }, { status: 400 })
            }

            // Busca as coberturas selecionadas
            const coberturas = await prisma.cobertura.findMany({
                where: {
                    id: { in: coberturaIds },
                    faturado: false
                }
            })

            // Trava Financeira: Apenas diárias baixadas como PAGAS ao diarista pelo financeiro podem ser faturadas ao cliente
            const naoPagas = coberturas.filter(c => c.status !== 'PAGO')
            if (naoPagas.length > 0) {
                return NextResponse.json({
                    error: `Atenção: ${naoPagas.length} diária(s) selecionada(s) ainda não foram baixadas como PAGAS ao diarista pelo financeiro. Apenas diárias com repasse baixado como PAGO podem ser faturadas ao cliente.`
                }, { status: 400 })
            }

            if (coberturas.length === 0) {
                return NextResponse.json({ error: "As diárias selecionadas já foram faturadas ou não estão disponíveis." }, { status: 400 })
            }

            // Busca a taxa atual
            const config = await prisma.configuracaoAuditoria.findFirst({ where: { ativo: true } })
            const taxaServicoPercentual = config?.taxaServicoClientePercentual ?? 10.0

            // Calcula totais
            let valorDiarias = 0
            coberturas.forEach(c => {
                valorDiarias += Number(c.valor || 0)
            })

            const valorTaxaServico = Number((valorDiarias * (taxaServicoPercentual / 100)).toFixed(2))
            const valorTotal = Number((valorDiarias + valorTaxaServico).toFixed(2))

            // Gerar número sequencial de fatura FAT-2026-XXXX
            const totalFaturasExistentes = await prisma.faturaCliente.count()
            const proximoNumero = String(totalFaturasExistentes + 1).padStart(4, '0')
            const anoAtual = new Date().getFullYear()
            const numeroFatura = `FAT-${anoAtual}-${proximoNumero}`

            // Data de Vencimento padrão: 10 dias após emissão
            const vencimento = new Date()
            vencimento.setDate(vencimento.getDate() + 10)

            // Cria a Fatura
            const novaFatura = await prisma.faturaCliente.create({
                data: {
                    numeroFatura,
                    empresaId,
                    valorDiarias,
                    taxaServicoPercentual,
                    valorTaxaServico,
                    valorTotal,
                    vencimentoEm: vencimento,
                    observacoes: observacoes || `Fatura referente a ${coberturas.length} plantão(ões) de diárias.`
                }
            })

            // Atualiza as coberturas para faturado = true
            await prisma.cobertura.updateMany({
                where: { id: { in: coberturas.map(c => c.id) } },
                data: {
                    faturado: true,
                    faturaClienteId: novaFatura.id,
                    dataFaturamento: new Date()
                }
            })

            return NextResponse.json({
                success: true,
                message: `Fatura ${numeroFatura} gerada com sucesso para ${coberturas.length} diárias!`,
                fatura: novaFatura
            })
        }

        return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 })

    } catch (error) {
        console.error("Erro ao processar faturamento:", error)
        return NextResponse.json({ error: "Erro ao processar ação de faturamento." }, { status: 500 })
    }
}
