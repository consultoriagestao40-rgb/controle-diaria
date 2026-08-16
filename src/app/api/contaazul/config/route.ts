import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
    getValidAccessToken,
    getContaAzulCategories,
    getContaAzulCostCenters,
    getContaAzulBankAccounts
} from "@/lib/contaazul"

// GET: Retorna as configurações e status do Conta Azul para todas as empresas
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    const allowed = ["ADMIN", "FINANCEIRO", "APROVADOR_N2"]
    if (!allowed.includes(user.role)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const empresas = await prisma.empresa.findMany({
            where: { ativo: true },
            include: { contaAzulConfig: true },
            orderBy: { nome: "asc" }
        })

        const empresasComStatus = await Promise.all(
            empresas.map(async (empresa) => {
                const config = empresa.contaAzulConfig
                let isConnected = false
                let tokenExpiry = null
                let categories: any[] = []
                let costCenters: any[] = []
                let bankAccounts: any[] = []

                if (config?.accessToken) {
                    const token = await getValidAccessToken(empresa.id)
                    isConnected = !!token
                    tokenExpiry = config.expiresAt

                    if (isConnected) {
                        // Carrega listas do Conta Azul
                        try {
                            [categories, costCenters, bankAccounts] = await Promise.all([
                                getContaAzulCategories(empresa.id),
                                getContaAzulCostCenters(empresa.id),
                                getContaAzulBankAccounts(empresa.id)
                            ])
                        } catch (e) {
                            console.error(`Erro ao buscar dados do Conta Azul para ${empresa.nome}:`, e)
                        }
                    }
                }

                return {
                    id: empresa.id,
                    nome: empresa.nome,
                    cnpj: empresa.cnpj,
                    config: config ? {
                        id: config.id,
                        clientId: config.clientId || "",
                        clientSecretConfigured: !!config.clientSecret,
                        redirectUri: config.redirectUri,
                        ativo: config.ativo,
                        autoCriarAoAprovar: config.autoCriarAoAprovar,
                        categoriaDiariaId: config.categoriaDiariaId,
                        categoriaDiariaNome: config.categoriaDiariaNome,
                        categoriaDiariaServicoVendidoId: config.categoriaDiariaServicoVendidoId,
                        categoriaDiariaServicoVendidoNome: config.categoriaDiariaServicoVendidoNome,
                        categoriaDiariaCoberturaId: config.categoriaDiariaCoberturaId,
                        categoriaDiariaCoberturaNome: config.categoriaDiariaCoberturaNome,
                        categoriaReembolsoId: config.categoriaReembolsoId,
                        categoriaReembolsoNome: config.categoriaReembolsoNome,
                        categoriaAdiantamentoId: config.categoriaAdiantamentoId,
                        categoriaAdiantamentoNome: config.categoriaAdiantamentoNome,
                        centroCustoPadraoId: config.centroCustoPadraoId,
                        centroCustoPadraoNome: config.centroCustoPadraoNome,
                        contaFinanceiraPadraoId: config.contaFinanceiraPadraoId,
                        contaFinanceiraPadraoNome: config.contaFinanceiraPadraoNome,
                        ultimaSincronizacao: config.ultimaSincronizacao
                    } : null,
                    isConnected,
                    tokenExpiry,
                    categories,
                    costCenters,
                    bankAccounts
                }
            })
        )

        return NextResponse.json(empresasComStatus)
    } catch (error: any) {
        console.error("[CONTA AZUL CONFIG GET ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Salva credenciais ou mapeamentos para uma empresa
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== "ADMIN" && user.role !== "FINANCEIRO") {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json()
        const {
            empresaId,
            clientId,
            clientSecret,
            redirectUri,
            ativo,
            autoCriarAoAprovar,
            categoriaDiariaId,
            categoriaDiariaNome,
            categoriaDiariaServicoVendidoId,
            categoriaDiariaServicoVendidoNome,
            categoriaDiariaCoberturaId,
            categoriaDiariaCoberturaNome,
            categoriaReembolsoId,
            categoriaReembolsoNome,
            categoriaAdiantamentoId,
            categoriaAdiantamentoNome,
            centroCustoPadraoId,
            centroCustoPadraoNome,
            contaFinanceiraPadraoId,
            contaFinanceiraPadraoNome
        } = body

        if (!empresaId) {
            return new NextResponse("Empresa ID é obrigatório", { status: 400 })
        }

        const dataUpdate: any = {}

        if (clientId !== undefined && !clientId.includes("...") && clientId.trim() !== "") dataUpdate.clientId = clientId.trim()
        if (clientSecret !== undefined && !clientSecret.includes("...") && clientSecret.trim() !== "") dataUpdate.clientSecret = clientSecret.trim()
        if (redirectUri !== undefined) dataUpdate.redirectUri = redirectUri
        if (ativo !== undefined) dataUpdate.ativo = ativo
        if (autoCriarAoAprovar !== undefined) dataUpdate.autoCriarAoAprovar = autoCriarAoAprovar

        if (categoriaDiariaId !== undefined) dataUpdate.categoriaDiariaId = categoriaDiariaId
        if (categoriaDiariaNome !== undefined) dataUpdate.categoriaDiariaNome = categoriaDiariaNome
        if (categoriaDiariaServicoVendidoId !== undefined) dataUpdate.categoriaDiariaServicoVendidoId = categoriaDiariaServicoVendidoId
        if (categoriaDiariaServicoVendidoNome !== undefined) dataUpdate.categoriaDiariaServicoVendidoNome = categoriaDiariaServicoVendidoNome
        if (categoriaDiariaCoberturaId !== undefined) dataUpdate.categoriaDiariaCoberturaId = categoriaDiariaCoberturaId
        if (categoriaDiariaCoberturaNome !== undefined) dataUpdate.categoriaDiariaCoberturaNome = categoriaDiariaCoberturaNome
        if (categoriaReembolsoId !== undefined) dataUpdate.categoriaReembolsoId = categoriaReembolsoId
        if (categoriaReembolsoNome !== undefined) dataUpdate.categoriaReembolsoNome = categoriaReembolsoNome
        if (categoriaAdiantamentoId !== undefined) dataUpdate.categoriaAdiantamentoId = categoriaAdiantamentoId
        if (categoriaAdiantamentoNome !== undefined) dataUpdate.categoriaAdiantamentoNome = categoriaAdiantamentoNome

        if (centroCustoPadraoId !== undefined) dataUpdate.centroCustoPadraoId = centroCustoPadraoId
        if (centroCustoPadraoNome !== undefined) dataUpdate.centroCustoPadraoNome = centroCustoPadraoNome
        if (contaFinanceiraPadraoId !== undefined) dataUpdate.contaFinanceiraPadraoId = contaFinanceiraPadraoId
        if (contaFinanceiraPadraoNome !== undefined) dataUpdate.contaFinanceiraPadraoNome = contaFinanceiraPadraoNome

        const updatedConfig = await prisma.contaAzulConfig.upsert({
            where: { empresaId },
            create: {
                empresaId,
                ...dataUpdate
            },
            update: dataUpdate
        })

        return NextResponse.json({ success: true, config: updatedConfig })
    } catch (error: any) {
        console.error("[CONTA AZUL CONFIG POST ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
