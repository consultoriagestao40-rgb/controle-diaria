import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPayableFromDespesa } from "@/lib/contaazul"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    const { id } = await params

    const allowedRoles = ['SUPERVISOR', 'APROVADOR_N1', 'APROVADOR_N2', 'APROVADOR', 'ADMIN', 'FINANCEIRO']
    if (!allowedRoles.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { chavePix, empresaId } = body

        if (chavePix && chavePix.trim()) {
            await prisma.despesa.update({
                where: { id },
                data: {
                    chavePix: chavePix.trim(),
                    ...(empresaId ? { empresaId } : {})
                }
            })
        } else if (empresaId) {
            await prisma.despesa.update({
                where: { id },
                data: { empresaId }
            })
        }

        const despesa = await prisma.despesa.findUnique({
            where: { id },
            include: { empresa: true, solicitante: true }
        })

        if (!despesa) {
            return NextResponse.json({ error: "Despesa não encontrada." }, { status: 404 })
        }

        if (despesa.status !== "APROVADO" && despesa.status !== "PAGO") {
            return NextResponse.json({ error: "Apenas despesas aprovadas podem ser enviadas ao Conta Azul." }, { status: 400 })
        }

        const caResult = await createPayableFromDespesa(id)
        if (caResult.success) {
            await prisma.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: despesa.status,
                    paraStatus: despesa.status,
                    usuarioId: user.id,
                    observacao: `[Conta Azul] Sincronização manual executada com sucesso (ID: ${caResult.payableId})`
                }
            })
            return NextResponse.json({ success: true, payableId: caResult.payableId })
        } else {
            await prisma.historicoDespesa.create({
                data: {
                    despesaId: id,
                    deStatus: despesa.status,
                    paraStatus: despesa.status,
                    usuarioId: user.id,
                    observacao: `[Conta Azul Falha] Erro na sincronização manual: ${caResult.error}`
                }
            })
            return NextResponse.json({ success: false, error: caResult.error }, { status: 400 })
        }
    } catch (error: any) {
        console.error("Erro ao sincronizar despesa no Conta Azul:", error)
        return NextResponse.json({ error: error.message || "Erro interno." }, { status: 500 })
    }
}
