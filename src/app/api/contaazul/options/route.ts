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

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }

        // Busca simultânea de Categorias, Centros de Custo e Contas Financeiras
        const [resCat, resCc, resContas] = await Promise.all([
            fetch("https://api-v2.contaazul.com/v1/categorias?tamanho_pagina=250", { headers }).catch(() => null),
            fetch("https://api-v2.contaazul.com/v1/centro-de-custo?tamanho_pagina=250", { headers }).catch(() => null),
            fetch("https://api-v2.contaazul.com/v1/conta-financeira?tamanho_pagina=100", { headers }).catch(() => null)
        ])

        // Processa Categorias
        let categorias: any[] = []
        if (resCat && resCat.ok) {
            const dataCat = await resCat.json().catch(() => ({}))
            const itensCat = dataCat.itens || []
            categorias = itensCat.map((item: any) => ({
                id: item.id,
                nome: item.nome,
                tipo: item.tipo || "DESPESA"
            })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        }

        // Processa Centros de Custo
        let centrosCusto: any[] = []
        if (resCc && resCc.ok) {
            const dataCc = await resCc.json().catch(() => ({}))
            const itensCc = dataCc.itens || []
            centrosCusto = itensCc.map((item: any) => ({
                id: item.id,
                nome: item.nome,
                codigo: item.codigo || "",
                ativo: item.ativo !== false
            })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        }

        // Processa Contas Financeiras (Bancos, Cartões, Conta PJ Conta Azul)
        let contasFinanceiras: any[] = []
        if (resContas && resContas.ok) {
            const dataContas = await resContas.json().catch(() => ({}))
            const itensContas = dataContas.itens || []
            contasFinanceiras = itensContas.map((item: any) => ({
                id: item.id,
                nome: item.nome,
                banco: item.banco || "",
                tipo: item.tipo || "",
                agencia: item.agencia || "",
                numero: item.numero || "",
                ativo: item.ativo !== false
            })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        }

        return NextResponse.json({
            success: true,
            categorias,
            centrosCusto,
            contasFinanceiras
        })
    } catch (error: any) {
        console.error("[CONTA AZUL OPTIONS ERROR]", error)
        return NextResponse.json({ error: error.message || "Erro interno ao buscar opções do Conta Azul." }, { status: 500 })
    }
}
