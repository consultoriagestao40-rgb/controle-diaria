import { NextRequest, NextResponse } from "next/server"
import { exchangeContaAzulCodeForTokens } from "@/lib/contaazul"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const stateRaw = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin

    if (error) {
        return NextResponse.redirect(`${baseUrl}/dashboard/admin/configs?tab=contaazul&status=error&message=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/dashboard/admin/configs?tab=contaazul&status=error&message=Código+de+autorização+não+recebido`)
    }

    let empresaId = ""
    try {
        if (stateRaw) {
            const decoded = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf-8"))
            empresaId = decoded.empresaId
        }
    } catch {
        empresaId = stateRaw || ""
    }

    if (!empresaId) {
        return NextResponse.redirect(`${baseUrl}/dashboard/admin/configs?tab=contaazul&status=error&message=Identificador+da+empresa+ausente+no+retorno`)
    }

    const result = await exchangeContaAzulCodeForTokens(code, empresaId)

    if (result.success) {
        return NextResponse.redirect(`${baseUrl}/dashboard/admin/configs?tab=contaazul&status=success&empresaId=${empresaId}`)
    } else {
        return NextResponse.redirect(`${baseUrl}/dashboard/admin/configs?tab=contaazul&status=error&message=${encodeURIComponent(result.error || "Erro ao trocar tokens")}`)
    }
}
