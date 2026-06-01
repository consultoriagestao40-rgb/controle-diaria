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

        if (despesa.status !== 'AGUARDANDO_PRESTACAO') {
            return new NextResponse(
                JSON.stringify({ error: "Apenas despesas aguardando prestação de contas com saldo pendente podem ser conciliadas." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const saldo = despesa.saldoFinal ? Number(despesa.saldoFinal) : 0
        if (saldo === 0) {
            return new NextResponse(
                JSON.stringify({ error: "Esta despesa não possui saldo pendente para conciliação manual." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const body = await req.json()
        const { observacao } = body

        const despesaAtualizada = await prisma.$transaction(async (tx) => {
            const atualizada = await tx.despesa.update({
                where: { id },
                data: {
                    status: 'CONCLUIDO',
                    financeiroId: user.id,
                    observacao: observacao || null
                }
            })

            let historicoObs = `Conciliação financeira realizada por ${user.nome}. `
            if (saldo > 0) {
                historicoObs += `Confirmado o recebimento da devolução de R$ ${saldo.toFixed(2)} pelo colaborador.`
            } else {
                historicoObs += `Confirmado o pagamento do reembolso complementar de R$ ${Math.abs(saldo).toFixed(2)} ao colaborador.`
            }
            if (observacao) historicoObs += ` Observação: ${observacao}`

            // Registrar histórico
            await tx.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: 'AGUARDANDO_PRESTACAO',
                    paraStatus: 'CONCLUIDO',
                    usuarioId: user.id,
                    observacao: historicoObs
                }
            })

            return atualizada
        })

        return NextResponse.json(despesaAtualizada)
    } catch (error) {
        console.error("Erro ao conciliar despesa:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
