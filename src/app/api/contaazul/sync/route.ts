import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncContaAzulPayables } from "@/lib/contaazul"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    const allowed = ["ADMIN", "FINANCEIRO", "APROVADOR_N2"]
    if (!allowed.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        let empresaId: string | undefined = undefined
        try {
            const body = await req.json()
            empresaId = body.empresaId
        } catch {
            // No body or empty
        }

        const result = await syncContaAzulPayables(empresaId)

        const parts: string[] = []
        if (result.coberturasCriadas > 0) parts.push(`${result.coberturasCriadas} diárias criadas no ERP`)
        if (result.despesasCriadas > 0) parts.push(`${result.despesasCriadas} reembolsos criados no ERP`)
        if (result.coberturasAtualizadas > 0) parts.push(`${result.coberturasAtualizadas} diárias baixadas`)
        if (result.despesasAtualizadas > 0) parts.push(`${result.despesasAtualizadas} reembolsos baixados`)

        let message = parts.length > 0 
            ? `Sincronização concluída: ${parts.join(", ")}.`
            : "Sincronização concluída. Nenhum novo título pendente de criação ou baixa."

        if (result.erros && result.erros.length > 0) {
            message += ` (Avisos: ${result.erros[0]})`
        }

        return NextResponse.json({
            success: true,
            ...result,
            message
        })
    } catch (error: any) {
        console.error("[CONTA AZUL SYNC ERROR]", error)
        return new NextResponse(JSON.stringify({ error: error.message || "Erro na sincronização" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        })
    }
}
