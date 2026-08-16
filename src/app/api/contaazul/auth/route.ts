import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getContaAzulAuthorizationUrl } from "@/lib/contaazul"

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = session.user as any
    if (user.role !== "ADMIN" && user.role !== "FINANCEIRO" && user.role !== "APROVADOR_N2") {
        return new NextResponse("Forbidden", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get("empresaId")

    if (!empresaId) {
        return new NextResponse("Empresa ID é obrigatório", { status: 400 })
    }

    try {
        const authUrl = await getContaAzulAuthorizationUrl(empresaId)
        return NextResponse.redirect(authUrl)
    } catch (error: any) {
        return new NextResponse(`Erro ao gerar URL de autorização: ${error.message}`, { status: 500 })
    }
}
