import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    const { id } = await params

    try {
        const body = await req.json()
        const {
            fornecedorNome,
            fornecedorCnpj,
            fornecedorEmail,
            fornecedorTelefone,
            fornecedorContato,
            condicoesPagamento,
            dataVencimentoSugerida,
            emailEnvioNf,
            enderecoEntrega,
            observacoesFiscais,
            anexoCotacaoUrl,
            anexoCotacaoNome,
            dadosExtracaoIA,
            itens,
            enviarParaAprovacao = true
        } = body

        const pedido = await prisma.pedidoCompra.findUnique({
            where: { id },
            include: { itens: true }
        })

        if (!pedido) {
            return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
        }

        // Atualizar itens e calcular total cotado
        let totalCotado = 0
        if (Array.isArray(itens)) {
            for (const item of itens) {
                const precoUnitario = Number(item.precoUnitario) || 0
                const qtd = Number(item.quantidade) || 1
                const precoTotal = Number((precoUnitario * qtd).toFixed(2))
                totalCotado += precoTotal

                if (item.id) {
                    await prisma.itemPedidoCompra.update({
                        where: { id: item.id },
                        data: {
                            precoUnitario,
                            precoTotal,
                            quantidade: qtd,
                            fornecedor: item.fornecedor || fornecedorNome
                        }
                    })
                }
            }
        }

        const novoStatus = enviarParaAprovacao ? 'AGUARDANDO_APROVACAO' : 'COTADO'

        const updated = await prisma.pedidoCompra.update({
            where: { id },
            data: {
                status: novoStatus,
                compradorId: user.id,
                fornecedorNome,
                fornecedorCnpj,
                fornecedorEmail,
                fornecedorTelefone,
                fornecedorContato,
                condicoesPagamento,
                dataVencimentoSugerida: dataVencimentoSugerida ? new Date(dataVencimentoSugerida) : null,
                emailEnvioNf,
                enderecoEntrega,
                observacoesFiscais,
                valorTotalCotado: totalCotado,
                anexoCotacaoUrl: anexoCotacaoUrl || pedido.anexoCotacaoUrl,
                anexoCotacaoNome: anexoCotacaoNome || pedido.anexoCotacaoNome,
                dadosExtracaoIA: dadosExtracaoIA ? JSON.stringify(dadosExtracaoIA) : pedido.dadosExtracaoIA,
                historico: {
                    create: {
                        deStatus: pedido.status,
                        paraStatus: novoStatus,
                        usuarioId: user.id,
                        observacao: enviarParaAprovacao
                            ? `Cotação finalizada por ${user.name || user.email}. Fornecedor: ${fornecedorNome || 'N/A'}. Valor Total: R$ ${totalCotado.toFixed(2)}. Enviado para aprovação do gestor.`
                            : `Rascunho de cotação salvo por ${user.name || user.email}.`
                    }
                }
            },
            include: {
                itens: true,
                historico: {
                    orderBy: { data: 'desc' },
                    take: 5
                }
            }
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("Erro ao salvar cotação:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
