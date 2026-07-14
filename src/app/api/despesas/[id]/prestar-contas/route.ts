import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runExpenseAudit } from "@/lib/audit"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    const { id } = await params
 
    try {
        const despesa = await prisma.despesa.findUnique({
            where: { id }
        })
 
        if (!despesa) {
            return new NextResponse(
                JSON.stringify({ error: "Despesa não encontrada." }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }
 
        // Apenas o solicitante original ou Admin pode prestar contas
        if (despesa.solicitanteId !== user.id && user.role !== 'ADMIN') {
            return new NextResponse("Forbidden", { status: 403 })
        }
 
        // Deve ser um adiantamento e estar no status correto
        if (despesa.tipo !== 'ADIANTAMENTO') {
            return new NextResponse(
                JSON.stringify({ error: "Prestação de contas só é aplicável para Adiantamentos." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
 
        if (despesa.status !== 'AGUARDANDO_PRESTACAO' && despesa.status !== 'APROVADO') {
            return new NextResponse(
                JSON.stringify({ error: "Despesa não está em estado de prestação de contas." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
 
        const body = await req.json()
        const { valorComprovado, anexos, observacao, itens } = body

        // Processar itens detalhados da prestação de contas
        let itemsToCreate: any[] = []
        let totalCalculado = 0

        if (itens && Array.isArray(itens) && itens.length > 0) {
            for (const item of itens) {
                const { categoria, descricao: itemDesc, data, quantidade, valorUnitario } = item
                if (!categoria || !itemDesc || !data || !quantidade || !valorUnitario) {
                    return new NextResponse(
                        JSON.stringify({ error: "Todos os itens de prestação devem conter: categoria, descrição, data, quantidade e valor unitário." }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    )
                }

                const qty = parseInt(quantidade)
                const valUnit = Math.round(parseFloat(valorUnitario) * 100) / 100

                if (isNaN(qty) || qty <= 0 || isNaN(valUnit) || valUnit <= 0) {
                    return new NextResponse(
                        JSON.stringify({ error: "Quantidade e valor unitário devem ser maiores que zero." }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    )
                }

                const valTotal = Math.round(qty * valUnit * 100) / 100
                totalCalculado = Math.round((totalCalculado + valTotal) * 100) / 100

                itemsToCreate.push({
                    categoria: categoria.toUpperCase().trim(),
                    descricao: itemDesc,
                    data: new Date(data),
                    quantidade: qty,
                    valorUnitario: valUnit,
                    valorTotal: valTotal
                })
            }
        }
 
        const valorComp = itemsToCreate.length > 0 ? totalCalculado : Math.round(parseFloat(valorComprovado) * 100) / 100

        if (isNaN(valorComp) || valorComp < 0) {
            return new NextResponse(
                JSON.stringify({ error: "Valor comprovado inválido." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
 
        if (!anexos || !Array.isArray(anexos) || anexos.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "É obrigatório anexar pelo menos um comprovante físico/recibo." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
 
        const valorSolicitado = Number(despesa.valorSolicitado)
        const saldo = Math.round((valorSolicitado - valorComp) * 100) / 100
 
        // Executar auditoria de termos e políticas (com itens)
        const auditResult = await runExpenseAudit(
            despesa.descricao + " | Prestação: " + (observacao || ""),
            valorComp,
            anexos,
            itemsToCreate
        )

        // Buscar o centro de custo do solicitante para roteamento de níveis de aprovação
        const solicitanteUser = await prisma.user.findUnique({
            where: { id: despesa.solicitanteId },
            include: {
                centroCusto: true
            }
        })
        const hasN1 = solicitanteUser?.centroCusto?.aprovadorN1Id ? true : false

        // Prestações de contas passam pela aprovação superior de níveis N1 ou N2 antes da conciliação final
        const novoStatus = hasN1 ? 'AGUARDANDO_APROVACAO_N1' : 'AGUARDANDO_APROVACAO_N2'
 
        const despesaAtualizada = await prisma.$transaction(async (tx) => {
            // Limpar itens anteriores de adiantamento (estimativas)
            await tx.itemDespesa.deleteMany({
                where: { despesaId: id }
            })

            // Criar novos itens reais de prestação
            for (const item of itemsToCreate) {
                await tx.itemDespesa.create({
                    data: {
                        despesaId: id,
                        categoria: item.categoria,
                        descricao: item.descricao,
                        data: item.data,
                        quantidade: item.quantidade,
                        valorUnitario: item.valorUnitario,
                        valorTotal: item.valorTotal
                    }
                })
            }

            // Limpar anexos anteriores para evitar duplicações
            await tx.anexo.deleteMany({
                where: { despesaId: id }
            })

            // Criar os anexos da prestação de contas
            for (const anexo of anexos) {
                await tx.anexo.create({
                    data: {
                        url: anexo.url,
                        nomeOriginal: anexo.nomeOriginal,
                        tamanho: anexo.tamanho,
                        tipo: anexo.tipo,
                        usuarioId: user.id,
                        despesaId: id
                    }
                })
            }
 
            // Atualiza dados da despesa
            const atualizada = await tx.despesa.update({
                where: { id },
                data: {
                    status: novoStatus,
                    valorComprovado: valorComp,
                    saldoFinal: saldo,
                    observacao: observacao || null,
                    alertaAuditoria: auditResult.alertMessage
                }
            })
 
            // Histórico de auditoria
            let historicoObs = `Prestação de contas enviada por ${user.nome}. Gasto real: R$ ${valorComp.toFixed(2)}. Direcionado para aprovação superior do gestor.`
 
            await tx.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: despesa.status,
                    paraStatus: novoStatus,
                    usuarioId: user.id,
                    observacao: historicoObs
                }
            })
 
            return atualizada
        })
 
        return NextResponse.json(despesaAtualizada)
    } catch (error) {
        console.error("Erro ao realizar prestação de contas:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
