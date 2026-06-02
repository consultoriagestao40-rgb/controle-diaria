import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    const { id } = await params

    const allowedRoles = ['SUPERVISOR', 'APROVADOR_N1', 'APROVADOR_N2', 'APROVADOR', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const despesa = await prisma.despesa.findUnique({
            where: { id },
            include: {
                centroCusto: true
            }
        })

        if (!despesa) {
            return new NextResponse(
                JSON.stringify({ error: "Despesa não encontrada." }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }

        const validStatuses = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2']
        if (!validStatuses.includes(despesa.status)) {
            return new NextResponse(
                JSON.stringify({ error: "Apenas despesas aguardando aprovação podem ser aprovadas ou reprovadas." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const body = await req.json()
        const { action, justificativa } = body

        if (!action || (action !== 'APROVAR' && action !== 'REPROVAR')) {
            return new NextResponse(
                JSON.stringify({ error: "Ação inválida. Deve ser 'APROVAR' ou 'REPROVAR'." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        if (action === 'REPROVAR' && !justificativa) {
            return new NextResponse(
                JSON.stringify({ error: "Justificativa é obrigatória para reprovações." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        let isPrestacao = despesa.tipo === 'ADIANTAMENTO' && despesa.valorComprovado !== null
        let novoStatus: any = 'RASCUNHO'

        if (action === 'APROVAR') {
            if (despesa.status === 'AGUARDANDO_APROVACAO_N1' && despesa.centroCusto?.aprovadorN2Id) {
                novoStatus = 'AGUARDANDO_APROVACAO_N2'
            } else {
                novoStatus = isPrestacao ? 'AGUARDANDO_CONCILIACAO' : 'APROVADO'
            }
        } else {
            novoStatus = isPrestacao ? 'AGUARDANDO_PRESTACAO' : 'REPROVADO'
        }

        const despesaAtualizada = await prisma.$transaction(async (tx) => {
            const atualizada = await tx.despesa.update({
                where: { id },
                data: {
                    status: novoStatus,
                    aprovadorId: user.id,
                    dataAprovacao: action === 'APROVAR' ? new Date() : despesa.dataAprovacao,
                    justificativaAprovacao: action === 'APROVAR' ? (justificativa || null) : despesa.justificativaAprovacao,
                    justificativaReprovacao: action === 'REPROVAR' ? justificativa : despesa.justificativaReprovacao
                }
            })

            let obs = ""
            if (isPrestacao) {
                obs = action === 'APROVAR'
                    ? (novoStatus === 'AGUARDANDO_APROVACAO_N2'
                        ? `Prestação de contas aprovada em N1 por ${user.nome}. Encaminhado para aprovação final N2.`
                        : `Prestação de contas aprovada por gestor ${user.nome}. Encaminhado para conciliação final. ${justificativa || ""}`)
                    : `Prestação de contas devolvida para correção por gestor ${user.nome}. Motivo: ${justificativa}`
            } else {
                obs = action === 'APROVAR'
                    ? (novoStatus === 'AGUARDANDO_APROVACAO_N2'
                        ? `Solicitação aprovada em N1 por ${user.nome}. Encaminhado para aprovação final N2.`
                        : `Solicitação aprovada por ${user.nome}. ${justificativa || ""}`)
                    : `Solicitação reprovada por ${user.nome}. Motivo: ${justificativa}`
            }

            // Registrar histórico
            await tx.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: despesa.status,
                    paraStatus: novoStatus,
                    usuarioId: user.id,
                    observacao: obs
                }
            })

            return atualizada
        })

        return NextResponse.json(despesaAtualizada)
    } catch (error) {
        console.error("Erro ao aprovar/reprovar despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
