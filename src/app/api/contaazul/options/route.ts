import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getValidAccessToken } from "@/lib/contaazul"
import { prisma } from "@/lib/prisma"

const DEFAULT_CATEGORIAS = [
    { id: "combustivel", nome: "Combustível", tipo: "DESPESA" },
    { id: "diaria", nome: "Diária / Deslocamento", tipo: "DESPESA" },
    { id: "epi", nome: "EPI / Uniformes", tipo: "DESPESA" },
    { id: "alimentacao", nome: "Alimentação / Refeição", tipo: "DESPESA" },
    { id: "hospedagem", nome: "Hospedagem", tipo: "DESPESA" },
    { id: "transporte", nome: "Transporte / Pedágio", tipo: "DESPESA" },
    { id: "materiais", nome: "Materiais e Ferramentas", tipo: "DESPESA" },
    { id: "manutencao", nome: "Manutenção", tipo: "DESPESA" },
    { id: "outros", nome: "Outras Despesas", tipo: "DESPESA" },
]

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get("empresaId")

    // Buscar centros de custo locais do sistema para merge/fallback
    const localCentros = await prisma.centroCusto.findMany({
        where: { ativo: true },
        select: { id: true, nome: true }
    }).catch(() => [])

    const fallbackCentros = localCentros.map(cc => ({
        id: cc.id,
        nome: cc.nome,
        codigo: "",
        ativo: true
    }))

    if (!empresaId) {
        return NextResponse.json({
            success: true,
            categorias: DEFAULT_CATEGORIAS,
            centrosCusto: fallbackCentros,
            contasFinanceiras: []
        })
    }

    try {
        const token = await getValidAccessToken(empresaId)
        if (!token) {
            return NextResponse.json({
                success: true,
                aviso: "Empresa não possui token ativo no Conta Azul. Utilizando opções padrão.",
                categorias: DEFAULT_CATEGORIAS,
                centrosCusto: fallbackCentros,
                contasFinanceiras: []
            })
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
            // Preferir categorias de DESPESA
            const despesas = itensCat.filter((item: any) => !item.tipo || item.tipo === "DESPESA")
            const baseList = despesas.length > 0 ? despesas : itensCat
            categorias = baseList.map((item: any) => ({
                id: item.id,
                nome: item.nome,
                tipo: item.tipo || "DESPESA"
            })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        }

        if (categorias.length === 0) {
            categorias = DEFAULT_CATEGORIAS
        }

        // Processa Centros de Custo
        let centrosCusto: any[] = []
        if (resCc && resCc.ok) {
            const dataCc = await resCc.json().catch(() => ({}))
            const itensCc = dataCc.itens || []
            centrosCusto = itensCc
                .filter((item: any) => item.ativo !== false)
                .map((item: any) => ({
                    id: item.id,
                    nome: item.nome,
                    codigo: item.codigo || "",
                    ativo: true
                })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        }

        // Adiciona centros locais caso não existam nos centros do Conta Azul
        for (const localCc of fallbackCentros) {
            if (!centrosCusto.some(cc => cc.nome.toLowerCase() === localCc.nome.toLowerCase())) {
                centrosCusto.push(localCc)
            }
        }

        if (centrosCusto.length === 0) {
            centrosCusto = fallbackCentros
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
        return NextResponse.json({
            success: true,
            categorias: DEFAULT_CATEGORIAS,
            centrosCusto: fallbackCentros,
            contasFinanceiras: [],
            aviso: "Erro ao consultar API externa do Conta Azul. Utilizando opções padrão."
        })
    }
}

