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

        if (despesa.status !== 'AGUARDANDO_PRESTACAO') {
            return new NextResponse(
                JSON.stringify({ error: "Despesa não está em estado de prestação de contas (deve ser paga primeiro)." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const body = await req.json()
        const { valorComprovado, anexos, observacao } = body

        if (valorComprovado === undefined || valorComprovado === null) {
            return new NextResponse(
                JSON.stringify({ error: "O valor comprovado é obrigatório." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const valorComp = parseFloat(valorComprovado)
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
        // Saldo = Solicitado - Comprovado
        // Ex: Solicitou 500, comprovou 400. Saldo = 100 (Colaborador deve devolver 100).
        // Ex: Solicitou 500, comprovou 600. Saldo = -100 (Empresa deve reembolsar 100).
        const saldo = valorSolicitado - valorComp

        // Se o saldo for exatamente 0, transiciona direto para CONCLUIDO.
        // Se houver saldo pendente (devedor ou credor), transiciona para CONCLUIDO após conciliação financeira, 
        // mas marcamos como concluído ou aguardando conciliação. 
        // Para manter compatibilidade com o enum de StatusDespesa, definimos:
        // - Saldo = 0: CONCLUIDO
        // - Saldo != 0: Mantém em AGUARDANDO_PRESTACAO até conciliação (ou podemos usar CONCLUIDO com saldo pendente para o financeiro liquidar)
        // Vamos definir que se o saldo for 0, vai direto para CONCLUIDO.
        // Se houver diferença, transiciona para CONCLUIDO após o Financeiro liquidar a diferença na rota de conciliar.
        const novoStatus = saldo === 0 ? 'CONCLUIDO' : 'AGUARDANDO_PRESTACAO'

        const despesaAtualizada = await prisma.$transaction(async (tx) => {
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
                    observacao: observacao || null
                }
            })

            // Histórico de auditoria
            let historicoObs = `Prestação de contas enviada por ${user.nome}. Gasto real: R$ ${valorComp.toFixed(2)}. `
            if (saldo === 0) {
                historicoObs += "Saldo zerado. Fluxo finalizado."
            } else if (saldo > 0) {
                historicoObs += `Sobrou dinheiro. Colaborador deve devolver R$ ${saldo.toFixed(2)} ao financeiro.`
            } else {
                historicoObs += `Faltou dinheiro. Empresa deve reembolsar complementar de R$ ${Math.abs(saldo).toFixed(2)} ao colaborador.`
            }

            await tx.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: 'AGUARDANDO_PRESTACAO',
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
