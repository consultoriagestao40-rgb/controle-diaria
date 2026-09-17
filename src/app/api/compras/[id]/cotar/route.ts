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
            fornecedores,
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

        // 1. Salvar ou atualizar os fornecedores no Catálogo Permanente de Fornecedores
        if (Array.isArray(fornecedores)) {
            for (const f of fornecedores) {
                if (f.nome && f.nome.trim()) {
                    const cleanNome = f.nome.trim()
                    const cleanCnpj = f.cnpj?.trim() || null

                    try {
                        let existing = null
                        if (cleanCnpj) {
                            existing = await prisma.fornecedor.findFirst({ where: { cnpj: cleanCnpj } })
                        }
                        if (!existing) {
                            existing = await prisma.fornecedor.findFirst({
                                where: { nome: { equals: cleanNome, mode: "insensitive" } }
                            })
                        }

                        if (existing) {
                            await prisma.fornecedor.update({
                                where: { id: existing.id },
                                data: {
                                    nome: cleanNome,
                                    cnpj: cleanCnpj || existing.cnpj,
                                    email: f.email?.trim() || existing.email,
                                    telefone: f.telefone?.trim() || existing.telefone,
                                    contato: f.contato?.trim() || existing.contato,
                                    condicoesPagamento: f.condicoesPagamento?.trim() || existing.condicoesPagamento
                                }
                            })
                        } else {
                            await prisma.fornecedor.create({
                                data: {
                                    nome: cleanNome,
                                    cnpj: cleanCnpj,
                                    email: f.email?.trim() || null,
                                    telefone: f.telefone?.trim() || null,
                                    contato: f.contato?.trim() || null,
                                    condicoesPagamento: f.condicoesPagamento?.trim() || null,
                                    ativo: true
                                }
                            })
                        }
                    } catch (e) {
                        console.warn("Aviso ao salvar fornecedor no catálogo:", e)
                    }
                }
            }
        }

        // 2. Atualizar itens do pedido com fornecedor vencedor e calcular total cotado
        let totalCotado = 0
        const fornecedoresVencedoresSet = new Set<string>()

        if (Array.isArray(itens)) {
            for (const item of itens) {
                const precoUnitario = Number(item.precoUnitario) || 0
                const qtd = Number(item.quantidade) || 1
                const precoTotal = Number((precoUnitario * qtd).toFixed(2))
                totalCotado += precoTotal

                const fNome = item.fornecedor?.trim() || fornecedorNome || "N/A"
                if (fNome && fNome !== "N/A") {
                    fornecedoresVencedoresSet.add(fNome)
                }

                if (item.id) {
                    await prisma.itemPedidoCompra.update({
                        where: { id: item.id },
                        data: {
                            precoUnitario,
                            precoTotal,
                            quantidade: qtd,
                            fornecedor: fNome,
                            fornecedorCnpj: item.fornecedorCnpj || null
                        }
                    })
                }
            }
        }

        // Determinar nome consolidado de fornecedor (ou indicação de múltiplos fornecedores / split)
        const fornecedoresVencedoresArr = Array.from(fornecedoresVencedoresSet)
        let resolvedFornecedorNome = fornecedorNome
        if (fornecedoresVencedoresArr.length > 1) {
            resolvedFornecedorNome = `Múltiplos Fornecedores (${fornecedoresVencedoresArr.join(", ")})`
        } else if (fornecedoresVencedoresArr.length === 1) {
            resolvedFornecedorNome = fornecedoresVencedoresArr[0]
        }

        const novoStatus = enviarParaAprovacao ? "AGUARDANDO_APROVACAO" : "COTADO"

        const updated = await prisma.pedidoCompra.update({
            where: { id },
            data: {
                status: novoStatus,
                compradorId: user.id,
                fornecedorNome: resolvedFornecedorNome,
                fornecedorCnpj: fornecedoresVencedoresArr.length === 1 ? fornecedorCnpj : null,
                fornecedorEmail: fornecedorEmail,
                fornecedorTelefone: fornecedorTelefone,
                fornecedorContato: fornecedorContato,
                condicoesPagamento: condicoesPagamento,
                dataVencimentoSugerida: dataVencimentoSugerida ? new Date(dataVencimentoSugerida) : null,
                emailEnvioNf,
                enderecoEntrega,
                observacoesFiscais,
                valorTotalCotado: totalCotado,
                cotacoesFornecedores: fornecedores ? JSON.stringify(fornecedores) : pedido.cotacoesFornecedores,
                anexoCotacaoUrl: anexoCotacaoUrl || pedido.anexoCotacaoUrl,
                anexoCotacaoNome: anexoCotacaoNome || pedido.anexoCotacaoNome,
                dadosExtracaoIA: dadosExtracaoIA ? JSON.stringify(dadosExtracaoIA) : pedido.dadosExtracaoIA,
                historico: {
                    create: {
                        deStatus: pedido.status,
                        paraStatus: novoStatus,
                        usuarioId: user.id,
                        observacao: enviarParaAprovacao
                            ? `Cotação finalizada por ${user.name || user.email}. Fornecedores: ${resolvedFornecedorNome}. Valor Total: R$ ${totalCotado.toFixed(2)}. Enviado para aprovação do gestor.`
                            : `Rascunho de cotação com múltiplos fornecedores salvo por ${user.name || user.email}.`
                    }
                }
            },
            include: {
                itens: true,
                historico: {
                    orderBy: { data: "desc" },
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
