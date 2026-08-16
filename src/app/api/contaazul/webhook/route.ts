import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log("[CONTA AZUL WEBHOOK RECEIVED]", JSON.stringify(body))

        const eventType = body.event || body.type || body.action
        const eventData = body.data || body.entity || body

        const eventId = eventData?.id || eventData?.event_id
        const isPaid = eventData?.status === "ACQUITTED" ||
                       eventData?.status === "PAID" ||
                       eventData?.status === "BAIXADO" ||
                       eventType === "FINANCIAL_EVENT_ACQUITTED"

        if (eventId && isPaid) {
            // Procura cobertura vinculada
            const cobertura = await prisma.cobertura.findFirst({
                where: { contaAzulPayableId: eventId },
                include: { empresa: true }
            })

            if (cobertura && cobertura.status !== "PAGO") {
                const receiptUrl = eventData?.receipt_url || `/api/contaazul/comprovante/${eventId}?empresaId=${cobertura.empresaId}`
                const dataPagamento = eventData?.payment_date ? new Date(eventData.payment_date) : new Date()

                await prisma.$transaction([
                    prisma.cobertura.update({
                        where: { id: cobertura.id },
                        data: {
                            status: "PAGO",
                            dataPagamento,
                            contaAzulStatus: "PAGO",
                            contaAzulReceiptUrl: receiptUrl,
                            contaAzulSyncedAt: new Date(),
                            anexos: {
                                create: {
                                    url: receiptUrl,
                                    nomeOriginal: `Comprovante_ContaAzul_${cobertura.id.slice(-6)}.pdf`,
                                    tamanho: 2048,
                                    tipo: "application/pdf",
                                    usuarioId: cobertura.supervisorId
                                }
                            }
                        }
                    }),
                    prisma.historicoWorkflow.create({
                        data: {
                            coberturaId: cobertura.id,
                            deStatus: cobertura.status,
                            paraStatus: "PAGO",
                            usuarioId: cobertura.supervisorId,
                            observacao: "[Conta Azul Webhook] Pagamento liquidado no ERP. Comprovante anexado automaticamente."
                        }
                    })
                ])
                console.log(`[CONTA AZUL WEBHOOK] Cobertura ${cobertura.id} atualizada para PAGO`)
            }

            // Procura despesa vinculada
            const despesa = await prisma.despesa.findFirst({
                where: { contaAzulPayableId: eventId }
            })

            if (despesa && despesa.status !== "PAGO" && despesa.status !== "AGUARDANDO_PRESTACAO") {
                const receiptUrl = eventData?.receipt_url || `/api/contaazul/comprovante/${eventId}?empresaId=${despesa.empresaId}`
                const dataPagamento = eventData?.payment_date ? new Date(eventData.payment_date) : new Date()
                const nextStatus = despesa.tipo === "REEMBOLSO" ? "PAGO" : "AGUARDANDO_PRESTACAO"

                await prisma.$transaction([
                    prisma.despesa.update({
                        where: { id: despesa.id },
                        data: {
                            status: nextStatus as any,
                            dataPagamento,
                            contaAzulStatus: "PAGO",
                            contaAzulReceiptUrl: receiptUrl,
                            contaAzulSyncedAt: new Date(),
                            anexos: {
                                create: {
                                    url: receiptUrl,
                                    nomeOriginal: `Comprovante_ContaAzul_${despesa.tipo}_${despesa.id.slice(-6)}.pdf`,
                                    tamanho: 2048,
                                    tipo: "application/pdf",
                                    usuarioId: despesa.solicitanteId
                                }
                            }
                        }
                    }),
                    prisma.historicoDespesa.create({
                        data: {
                            despesaId: despesa.id,
                            deStatus: despesa.status,
                            paraStatus: nextStatus as any,
                            usuarioId: despesa.solicitanteId,
                            observacao: "[Conta Azul Webhook] Pagamento liquidado no ERP."
                        }
                    })
                ])
                console.log(`[CONTA AZUL WEBHOOK] Despesa ${despesa.id} atualizada para ${nextStatus}`)
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error("[CONTA AZUL WEBHOOK ERROR]", error)
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
    }
}
