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

    const allowedRoles = ['FINANCEIRO', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

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

        if (despesa.status !== 'APROVADO') {
            return new NextResponse(
                JSON.stringify({ error: "Apenas despesas aprovadas pelo gestor podem ser pagas." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const body = await req.json()
        const { observacao } = body

        // Definindo o próximo status com base no tipo
        // - REEMBOLSO: Vai direto para PAGO (fluxo finalizado)
        // - ADIANTAMENTO: Financeiro efetua o pagamento e o sistema transiciona para AGUARDANDO_PRESTACAO
        const novoStatus = despesa.tipo === 'REEMBOLSO' ? 'PAGO' : 'AGUARDANDO_PRESTACAO'

        const despesaAtualizada = await prisma.$transaction(async (tx) => {
            const atualizada = await tx.despesa.update({
                where: { id },
                data: {
                    status: novoStatus,
                    financeiroId: user.id,
                    dataPagamento: new Date(),
                    observacao: observacao || null
                }
            })

            // Registrar histórico
            await tx.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: 'APROVADO',
                    paraStatus: novoStatus,
                    usuarioId: user.id,
                    observacao: despesa.tipo === 'REEMBOLSO'
                        ? `Reembolso pago por ${user.nome}.`
                        : `Adiantamento pago por ${user.nome}. Aguardando prestação de contas pelo colaborador.`
                }
            })

            return atualizada
        })

        return NextResponse.json(despesaAtualizada)
    } catch (error) {
        console.error("Erro ao registrar pagamento da despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
