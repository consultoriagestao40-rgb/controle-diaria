import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runExpenseAudit } from "@/lib/audit"

// GET: Detalhes de uma despesa específica
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    const { id } = await params

    try {
        const despesa = await prisma.despesa.findUnique({
            where: { id },
            include: {
                solicitante: {
                    select: { id: true, nome: true, email: true, role: true }
                },
                aprovador: {
                    select: { id: true, nome: true, email: true }
                },
                financeiro: {
                    select: { id: true, nome: true, email: true }
                },
                anexos: true,
                itens: true,
                historico: {
                    include: {
                        usuario: { select: { nome: true, role: true } }
                    },
                    orderBy: { data: 'asc' }
                }
            }
        })

        if (!despesa) {
            return new NextResponse(
                JSON.stringify({ error: "Despesa não encontrada." }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }

        // Regra de segurança: Usuário comum só vê suas próprias despesas
        const isAdminOrFinance = ['ADMIN', 'FINANCEIRO', 'APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2'].includes(user.role)
        if (despesa.solicitanteId !== user.id && !isAdminOrFinance) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        return NextResponse.json(despesa)
    } catch (error) {
        console.error("Erro ao buscar detalhes da despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// PATCH: Editar despesa (só permitido se estiver em RASCUNHO ou enviado para aprovação pelo próprio dono)
export async function PATCH(
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

        if (despesa.solicitanteId !== user.id && user.role !== 'ADMIN') {
            return new NextResponse("Forbidden", { status: 403 })
        }

        if (despesa.status !== 'RASCUNHO' && despesa.status !== 'AGUARDANDO_APROVACAO' && despesa.status !== 'REPROVADO') {
            return new NextResponse(
                JSON.stringify({ error: "Só é possível editar despesas em estado RASCUNHO, AGUARDANDO_APROVACAO ou REPROVADO." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const body = await req.json()
        const { descricao, valorSolicitado, enviarParaAprovacao } = body

        const updateData: any = {}
        if (descricao) updateData.descricao = descricao
        
        let valor = Number(despesa.valorSolicitado)
        if (valorSolicitado) {
            const parsedValor = parseFloat(valorSolicitado)
            if (isNaN(parsedValor) || parsedValor <= 0) {
                return new NextResponse(
                    JSON.stringify({ error: "Valor solicitado inválido." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }
            valor = Math.round(parsedValor * 100) / 100
            updateData.valorSolicitado = valor
        }

        // Rodar auditoria ao atualizar ou enviar para aprovação
        const existingAnexos = await prisma.anexo.findMany({ where: { despesaId: id } })
        const existingItens = await prisma.itemDespesa.findMany({ where: { despesaId: id } })
        const auditResult = await runExpenseAudit(
            descricao || despesa.descricao,
            valor,
            existingAnexos,
            existingItens.map(i => ({
                categoria: i.categoria,
                descricao: i.descricao,
                valorTotal: Number(i.valorTotal)
            }))
        )
        updateData.alertaAuditoria = auditResult.alertMessage

        let novoStatus = despesa.status as any
        if (enviarParaAprovacao && (despesa.status === 'RASCUNHO' || despesa.status === 'REPROVADO')) {
            if (despesa.tipo === 'ADIANTAMENTO') {
                novoStatus = 'AGUARDANDO_APROVACAO'
            } else {
                novoStatus = auditResult.hasProhibitedItems ? 'AGUARDANDO_APROVACAO' : 'APROVADO'
            }
            updateData.status = novoStatus
        }

        const despesaAtualizada = await prisma.$transaction(async (tx) => {
            const atualizada = await tx.despesa.update({
                where: { id },
                data: updateData
            })

            // Registrar histórico se houve mudança de status
            if (novoStatus !== despesa.status) {
                await tx.historicoDespesa.create({
                    data: {
                        despesaId: id,
                        deStatus: despesa.status,
                        paraStatus: novoStatus,
                        usuarioId: user.id,
                        observacao: novoStatus === 'APROVADO'
                            ? "Despesa aprovada automaticamente por estar dentro da política e encaminhada ao financeiro."
                            : (despesa.tipo === 'ADIANTAMENTO'
                                ? "Adiantamento enviado para aprovação superior do gestor."
                                : "Reembolso enviado para aprovação do gestor por violar políticas.")
                    }
                })
            }

            return atualizada
        })

        return NextResponse.json(despesaAtualizada)
    } catch (error) {
        console.error("Erro ao editar despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// DELETE: Remover despesa
export async function DELETE(
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

        const isMasterOrN2 = user.role === 'ADMIN' || user.role === 'APROVADOR_N2'

        if (despesa.solicitanteId !== user.id && !isMasterOrN2) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        // Common users can only delete drafts or rejected expenses. Master/N2 can delete any expense in any state.
        if (!isMasterOrN2 && despesa.status !== 'RASCUNHO' && despesa.status !== 'REPROVADO') {
            return new NextResponse(
                JSON.stringify({ error: "Só é possível excluir despesas em estado de RASCUNHO ou REPROVADO." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        await prisma.$transaction(async (tx) => {
            // Remove histórico associado
            await tx.historicoDespesa.deleteMany({
                where: { despesaId: id }
            })
            
            // Remove anexos associados
            await tx.anexo.deleteMany({
                where: { despesaId: id }
            })

            // Remove itens detalhados associados
            await tx.itemDespesa.deleteMany({
                where: { despesaId: id }
            })

            // Remove despesa
            await tx.despesa.delete({
                where: { id }
            })
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("Erro ao deletar despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
