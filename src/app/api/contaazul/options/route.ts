import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getValidAccessToken } from "@/lib/contaazul"

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
        return NextResponse.json({ error: "Empresa ID é obrigatório" }, { status: 400 })
    }

    try {
        const token = await getValidAccessToken(empresaId)
        if (!token) {
            return NextResponse.json({ error: "Empresa não conectada ao Conta Azul (OAuth pendente)." }, { status: 400 })
        }

        // Busca as categorias financeiras do Conta Azul (Plano de Contas)
        const res = await fetch("https://api-v2.contaazul.com/v1/categorias?tamanho_pagina=250", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            return NextResponse.json({ error: errData.message || "Erro ao consultar categorias no Conta Azul." }, { status: res.status })
        }

        const data = await res.json()
        const itens = data.itens || []

        // Filtra e organiza categorias
        const categorias = itens.map((item: any) => ({
            id: item.id,
            nome: item.nome,
            tipo: item.tipo || "DESPESA"
        })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))

        return NextResponse.json({
            success: true,
            categorias
        })
    } catch (error: any) {
        console.error("[CONTA AZUL OPTIONS ERROR]", error)
        return NextResponse.json({ error: error.message || "Erro interno ao buscar opções do Conta Azul." }, { status: 500 })
    }
}
