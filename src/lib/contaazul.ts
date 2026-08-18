import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

const CONTA_AZUL_API_URL = (process.env.CONTA_AZUL_API_URL || "https://api-v2.contaazul.com").replace(/\/v1\/?$/, "")
const CONTA_AZUL_AUTH_URL = process.env.CONTA_AZUL_AUTH_URL || "https://login.contaazul.com/#/oauth/authorize"
const CONTA_AZUL_TOKEN_URL = process.env.CONTA_AZUL_TOKEN_URL || "https://api-v2.contaazul.com/oauth/token"

export interface ContaAzulTokenResult {
    success: boolean
    accessToken?: string
    refreshToken?: string
    expiresIn?: number
    error?: string
}

export interface ContaAzulContact {
    id: string
    name: string
    cpf_cnpj?: string
    email?: string
    phone?: string
}

export interface ContaAzulPayableResult {
    success: boolean
    payableId?: string
    status?: string
    receiptUrl?: string
    error?: string
}

/**
 * Retorna as credenciais ativas de OAuth (Client ID, Secret, Redirect URI) para uma Empresa.
 */
export async function getEmpresaContaAzulCredentials(empresaId: string) {
    const config = await prisma.contaAzulConfig.findUnique({
        where: { empresaId },
        include: { empresa: true }
    })

    const clientId = config?.clientId || process.env.CONTA_AZUL_CLIENT_ID || ""
    const clientSecret = config?.clientSecret || process.env.CONTA_AZUL_CLIENT_SECRET || ""
    const redirectUri = config?.redirectUri || process.env.CONTA_AZUL_REDIRECT_URI || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/contaazul/callback`

    return {
        config,
        clientId,
        clientSecret,
        redirectUri
    }
}

/**
 * Gera a URL de autorização OAuth 2.0 para uma empresa específica.
 */
export async function getContaAzulAuthorizationUrl(empresaId: string, customState?: string) {
    const { clientId, redirectUri } = await getEmpresaContaAzulCredentials(empresaId)
    if (!clientId) {
        throw new Error("Client ID do Conta Azul não configurado para esta empresa.")
    }

    const stateObj = {
        empresaId,
        custom: customState || ""
    }
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64")
    const scope = encodeURIComponent("openid profile aws.cognito.signin.user.admin")

    return `${CONTA_AZUL_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`
}

/**
 * Realiza a troca do authorization code pelos tokens de acesso e refresh.
 */
export async function exchangeContaAzulCodeForTokens(code: string, empresaId: string): Promise<ContaAzulTokenResult> {
    const { clientId, clientSecret, redirectUri } = await getEmpresaContaAzulCredentials(empresaId)

    if (!clientId || !clientSecret) {
        return { success: false, error: "Credenciais de Client ID e Client Secret não configuradas." }
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    const bodyParams = new URLSearchParams()
    bodyParams.append("grant_type", "authorization_code")
    bodyParams.append("code", code)
    bodyParams.append("redirect_uri", redirectUri)

    try {
        const res = await fetch(CONTA_AZUL_TOKEN_URL, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyParams.toString()
        })

        const data = await res.json()

        if (!res.ok || data.error) {
            console.error("[CONTA AZUL TOKEN EXCHANGE ERROR]", data)
            return { success: false, error: data.error_description || data.error || "Falha na troca de tokens do Conta Azul." }
        }

        const accessToken = data.access_token
        const refreshToken = data.refresh_token
        const expiresIn = Number(data.expires_in) || 3600
        const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000) // 1 min de margem

        await prisma.contaAzulConfig.upsert({
            where: { empresaId },
            create: {
                empresaId,
                accessToken,
                refreshToken,
                expiresAt,
                ativo: true
            },
            update: {
                accessToken,
                refreshToken,
                expiresAt,
                ativo: true
            }
        })

        return {
            success: true,
            accessToken,
            refreshToken,
            expiresIn
        }
    } catch (error: any) {
        console.error("[CONTA AZUL TOKEN EXCHANGE EXCEPTION]", error)
        return { success: false, error: error.message || "Erro de conexão ao servidor do Conta Azul." }
    }
}

/**
 * Garante e retorna um Access Token válido, renovando automaticamente com refresh_token se necessário.
 */
export async function getValidAccessToken(empresaId: string): Promise<string | null> {
    const { config, clientId, clientSecret } = await getEmpresaContaAzulCredentials(empresaId)

    if (!config || !config.ativo || !config.accessToken) {
        return null
    }

    const now = new Date()
    // Se o token ainda é válido por mais de 2 minutos, usa ele diretamente
    if (config.expiresAt && config.expiresAt.getTime() > now.getTime() + 120000) {
        return config.accessToken
    }

    // Se tiver refresh token, renova
    if (config.refreshToken && clientId && clientSecret) {
        try {
            const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
            const bodyParams = new URLSearchParams()
            bodyParams.append("grant_type", "refresh_token")
            bodyParams.append("refresh_token", config.refreshToken)

            const res = await fetch(CONTA_AZUL_TOKEN_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: bodyParams.toString()
            })

            const data = await res.json()

            if (res.ok && data.access_token) {
                const accessToken = data.access_token
                const refreshToken = data.refresh_token || config.refreshToken
                const expiresIn = Number(data.expires_in) || 3600
                const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000)

                await prisma.contaAzulConfig.update({
                    where: { empresaId },
                    data: {
                        accessToken,
                        refreshToken,
                        expiresAt
                    }
                })

                return accessToken
            } else {
                console.error("[CONTA AZUL REFRESH TOKEN ERROR]", data)
            }
        } catch (error) {
            console.error("[CONTA AZUL REFRESH EXCEPTION]", error)
        }
    }

    // Se o token expirou e a renovação falhou, retorna null para indicar que precisa de reconexão
    if (config.expiresAt && config.expiresAt.getTime() <= now.getTime()) {
        return null
    }

    return config.accessToken
}

/**
 * Cliente HTTP genérico para chamar endpoints da API do Conta Azul
 */
export async function fetchContaAzul(empresaId: string, endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await getValidAccessToken(empresaId)
    if (!token) {
        throw new Error("Não autenticado ou token do Conta Azul indisponível para esta empresa.")
    }

    const url = endpoint.startsWith("http") ? endpoint : `${CONTA_AZUL_API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> || {})
    }

    const res = await fetch(url, {
        ...options,
        headers
    })

    if (res.status === 204) {
        return { success: true }
    }

    const text = await res.text()
    try {
        const json = JSON.parse(text)
        if (!res.ok) {
            return {
                error: json.message || json.error || `Erro retornado pela API do Conta Azul (${res.status})`,
                status: res.status,
                data: json
            }
        }
        return json
    } catch {
        if (!res.ok) {
            return { error: `Erro na API Conta Azul (${res.status}): ${text}`, status: res.status }
        }
        return { raw: text }
    }
}

/**
 * Busca ou cadastra um fornecedor/contato no Conta Azul (API v2 /v1/pessoas)
 */
export async function findOrCreateContaAzulContact(empresaId: string, contactInfo: {
    nome: string
    cpf?: string | null
    email?: string | null
    telefone?: string | null
    chavePix?: string | null
}): Promise<{ success: boolean; contactId?: string; error?: string }> {
    try {
        const cleanCpf = contactInfo.cpf?.replace(/\D/g, "")
        const searchTerm = cleanCpf || contactInfo.nome

        // 1. Tenta buscar por CPF ou Nome via /v1/pessoas
        const searchRes = await fetchContaAzul(empresaId, `/v1/pessoas?busca=${encodeURIComponent(searchTerm)}`)
        const items = searchRes?.itens || (Array.isArray(searchRes) ? searchRes : [])

        if (items.length > 0) {
            // Se temos CPF, tenta achar match exato
            if (cleanCpf) {
                const exactCpf = items.find((p: any) => 
                    p.documentos?.some((d: any) => d.numero?.replace(/\D/g, "") === cleanCpf)
                )
                if (exactCpf) return { success: true, contactId: exactCpf.id }
            }

            // Match por nome
            const exactName = items.find((p: any) => 
                p.nome?.toLowerCase().trim() === contactInfo.nome.toLowerCase().trim()
            )
            if (exactName) return { success: true, contactId: exactName.id }

            // Caso não tenha exato, pega o primeiro retornado da busca
            return { success: true, contactId: items[0].id }
        }

        // 2. Se não encontrou, cadastra nova Pessoa (Fornecedor) na API v2
        const payload: any = {
            nome: contactInfo.nome.trim(),
            tipo_pessoa: "Física",
            perfis: [{ tipo_perfil: "Fornecedor" }]
        }

        if (cleanCpf && cleanCpf.length === 11) {
            payload.documentos = [{ tipo: "CPF", numero: cleanCpf }]
        } else if (cleanCpf && cleanCpf.length === 14) {
            payload.tipo_pessoa = "Jurídica"
            payload.documentos = [{ tipo: "CNPJ", numero: cleanCpf }]
        }

        if (contactInfo.email) {
            payload.email = contactInfo.email
        }
        if (contactInfo.telefone) {
            payload.telefone = contactInfo.telefone
        }
        if (contactInfo.chavePix) {
            payload.informacoes_adicionais = `CHAVE PIX: ${contactInfo.chavePix.trim()}`
        }

        const createRes = await fetchContaAzul(empresaId, "/v1/pessoas", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        if (createRes?.id) {
            return { success: true, contactId: createRes.id }
        } else if (createRes?.error) {
            return { success: false, error: createRes.error }
        }

        return { success: true, contactId: createRes?.id }
    } catch (error: any) {
        console.error("[CONTA AZUL CONTACT ERROR]", error)
        return { success: false, error: error.message || "Erro ao gerenciar contato no Conta Azul." }
    }
}

/**
 * Resolve o Centro de Custo específico da empresa no Conta Azul
 */
export async function resolveCostCenterForEmpresa(
    empresaId: string,
    posto?: { nome: string; centroCustoContaAzulNome?: string | null; centroCustoContaAzulId?: string | null } | null,
    fallbackCostCenterId?: string | null
): Promise<string | null> {
    try {
        const queryTerm = posto?.centroCustoContaAzulNome || posto?.nome
        if (queryTerm) {
            const res = await fetchContaAzul(empresaId, `/v1/centro-de-custo?busca=${encodeURIComponent(queryTerm)}`)
            const itens = res?.itens || []
            if (itens.length > 0) {
                // Tenta match exato por nome
                const exact = itens.find((c: any) => c.nome?.toLowerCase().trim() === queryTerm.toLowerCase().trim())
                if (exact) return exact.id
                return itens[0].id
            }
        }
    } catch (e) {
        console.error("[RESOLVE COST CENTER ERROR]", e)
    }

    return posto?.centroCustoContaAzulId || fallbackCostCenterId || null
}

/**
 * Resolve a Conta Financeira (Banco) da empresa no Conta Azul
 */
export async function resolveFinancialAccountForEmpresa(
    empresaId: string,
    fallbackAccountId?: string | null
): Promise<string | null> {
    if (fallbackAccountId && fallbackAccountId.trim() !== "") return fallbackAccountId

    try {
        const res = await fetchContaAzul(empresaId, "/v1/conta-financeira")
        const itens = res?.itens || []
        if (itens.length > 0) {
            const contaPj = itens.find((c: any) => c.nome?.toLowerCase().includes("conta pj") || c.nome?.toLowerCase().includes("pj"))
            if (contaPj) return contaPj.id
            const active = itens.find((c: any) => c.ativo)
            if (active) return active.id
            return itens[0].id
        }
    } catch (e) {
        console.error("[RESOLVE FINANCIAL ACCOUNT ERROR]", e)
    }

    return null
}

/**
 * Calcula o 5º dia útil de um determinado mês (considerando Segunda a Sexta).
 */
export function getQuintoDiaUtil(ano: number, mesZeroIndexed: number): Date {
    let current = new Date(ano, mesZeroIndexed, 1)
    let businessDaysCount = 0

    while (businessDaysCount < 5) {
        const dayOfWeek = current.getDay() // 0 = Domingo, 6 = Sábado
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDaysCount++
            if (businessDaysCount === 5) {
                return current
            }
        }
        current = new Date(current.getTime() + 86400000)
    }
    return current
}

/**
 * Calcula a data de vencimento da diária segundo a regra:
 * - Vencimento em toda sexta-feira da semana do plantão.
 * - Se a sexta-feira coincidir com a semana do 5º dia útil (semana da folha de pagamento),
 *   o vencimento é prorrogado para a próxima sexta-feira (+7 dias).
 */
export function calculateDiariaVencimento(dataBaseInput: Date | string): Date {
    const d = typeof dataBaseInput === "string" ? new Date(dataBaseInput) : new Date(dataBaseInput)

    const dayOfWeek = d.getDay()
    let daysToFriday = (5 - dayOfWeek + 7) % 7
    if (dayOfWeek === 6) daysToFriday = 6

    let targetFriday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToFriday)

    // Identifica o 5º dia útil do mês da targetFriday
    const quintoDiaUtil = getQuintoDiaUtil(targetFriday.getFullYear(), targetFriday.getMonth())

    // Verifica se targetFriday está na mesma semana (segunda a domingo) que o 5º dia útil
    const getMonday = (dt: Date) => {
        const day = dt.getDay()
        const diff = (day === 0 ? -6 : 1) - day
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + diff)
    }

    const mondayTarget = getMonday(targetFriday)
    const mondayQuinto = getMonday(quintoDiaUtil)

    const isSameWeek = mondayTarget.getFullYear() === mondayQuinto.getFullYear() &&
                       mondayTarget.getMonth() === mondayQuinto.getMonth() &&
                       mondayTarget.getDate() === mondayQuinto.getDate()

    if (isSameWeek) {
        // Semana da folha: prorroga para a próxima sexta-feira (+7 dias)
        targetFriday = new Date(targetFriday.getFullYear(), targetFriday.getMonth(), targetFriday.getDate() + 7)
    }

    return targetFriday
}

/**
 * Cria lançamento de Contas a Pagar no Conta Azul a partir de uma Cobertura (Diária) aprovada
 */
export async function createPayableFromCobertura(coberturaId: string): Promise<ContaAzulPayableResult> {
    try {
        const cobertura = await prisma.cobertura.findUnique({
            where: { id: coberturaId },
            include: {
                diarista: true,
                posto: true,
                empresa: true
            }
        })

        if (!cobertura) {
            return { success: false, error: "Cobertura não encontrada." }
        }

        // Se não tiver empresa vinculada, busca a primeira empresa ativa
        let empresaId: string | null = cobertura.empresaId
        if (!empresaId) {
            const defaultEmpresa = await prisma.empresa.findFirst({ where: { ativo: true } })
            empresaId = defaultEmpresa?.id || null
            if (empresaId) {
                await prisma.cobertura.update({
                    where: { id: coberturaId },
                    data: { empresaId }
                })
            }
        }

        if (!empresaId) {
            return { success: false, error: "Nenhuma empresa associada a esta diária." }
        }

        const config = await prisma.contaAzulConfig.findUnique({
            where: { empresaId }
        })

        if (!config || !config.ativo || !config.autoCriarAoAprovar) {
            return { success: false, error: "Integração Conta Azul inativa para esta empresa." }
        }

        const token = await getValidAccessToken(empresaId)
        if (!token) {
            return { success: false, error: "Empresa não conectada ao Conta Azul (OAuth pendente)." }
        }

        // 1. Busca ou cria o Diarista como fornecedor no Conta Azul
        const contactResult = await findOrCreateContaAzulContact(empresaId, {
            nome: cobertura.diarista.nome,
            cpf: cobertura.diarista.cpf,
            telefone: cobertura.diarista.telefone,
            chavePix: cobertura.diarista.chavePix
        })

        const cleanPix = cobertura.diarista.chavePix?.trim()
        const pixInfo = cleanPix ? ` - PIX: ${cleanPix}` : ""
        const valor = Number(cobertura.valor)
        const dataCompetencia = format(new Date(cobertura.data), "yyyy-MM-dd")
        const calculatedVencimento = calculateDiariaVencimento(cobertura.dataVencimento || cobertura.data)
        const dataVencimento = format(calculatedVencimento, "yyyy-MM-dd")
        const descricao = `Diária: ${cobertura.diarista.nome}${pixInfo} - Posto ${cobertura.posto.nome} (Ref. ${format(new Date(cobertura.data), "dd/MM/yyyy")})`

        // 2. Resolução de Categoria Financeira
        const catFin = (cobertura.categoriaFinanceira || "").toLowerCase()
        let categoryId: string | null = null

        if (catFin.includes("serviço vendido") || catFin.includes("servico vendido") || catFin.includes("03.4.1")) {
            categoryId = config.categoriaDiariaServicoVendidoId || config.categoriaDiariaId
        } else if (catFin.includes("cobertura") || catFin.includes("03.4.2")) {
            categoryId = config.categoriaDiariaCoberturaId || config.categoriaDiariaId
        } else {
            categoryId = config.categoriaDiariaCoberturaId || config.categoriaDiariaId || config.categoriaDiariaServicoVendidoId
        }

        // Fallback de categoria se não configurada
        if (!categoryId) {
            const categories = await getContaAzulCategories(empresaId)
            const defaultCat = categories.find((c: any) => c.nome?.includes("Diária") || c.nome?.includes("03.4"))
            if (defaultCat) categoryId = defaultCat.id
        }

        // 3. Resolução de Centro de Custo e Conta Financeira da Empresa
        const costCenterId = await resolveCostCenterForEmpresa(empresaId, cobertura.posto, config.centroCustoPadraoId)
        const bankAccountId = await resolveFinancialAccountForEmpresa(empresaId, config.contaFinanceiraPadraoId)

        if (!bankAccountId) {
            return { success: false, error: "Nenhuma conta financeira/bancária localizada no Conta Azul para esta empresa." }
        }

        // 4. Monta o payload oficial da API v2 de Contas a Pagar
        const rateioObj: any = {
            id_categoria: categoryId,
            valor: valor
        }

        if (costCenterId) {
            rateioObj.rateio_centro_custo = [
                {
                    id_centro_custo: costCenterId,
                    valor: valor
                }
            ]
        }

        const observacao = `Beneficiário: ${cobertura.diarista.nome} | CPF: ${cobertura.diarista.cpf || "N/I"} | CHAVE PIX: ${cleanPix || "NÃO INFORMADA"} | Posto: ${cobertura.posto.nome} | Ref: ${format(new Date(cobertura.data), "dd/MM/yyyy")} | Diária ID: ${cobertura.id.slice(-6).toUpperCase()}`

        const payload: any = {
            data_competencia: dataCompetencia,
            valor: valor,
            descricao: descricao,
            observacao: observacao,
            contato: contactResult.contactId,
            conta_financeira: bankAccountId,
            rateio: [rateioObj],
            condicao_pagamento: {
                parcelas: [
                    {
                        descricao: "Parcela 1/1",
                        data_vencimento: dataVencimento,
                        nota: cleanPix ? `CHAVE PIX: ${cleanPix}` : "Pagamento via PIX",
                        conta_financeira: bankAccountId,
                        metodo_pagamento: "PIX_PAGAMENTO_INSTANTANEO",
                        detalhe_valor: {
                            valor_bruto: valor,
                            valor_liquido: valor
                        }
                    }
                ]
            }
        }

        // 5. Envia para a API da Conta Azul
        const response = await fetchContaAzul(empresaId, "/v1/financeiro/eventos-financeiros/contas-a-pagar", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        if (response?.error) {
            return { success: false, error: response.error }
        }

        let finalPayableId = response?.protocolo || response?.id || `CA-DIARIA-${cobertura.id.slice(-6).toUpperCase()}`

        // Se retornou protocolo assíncrono, aguarda 1.5s e consulta o ID final do evento
        if (response?.protocolo) {
            try {
                await new Promise(resolve => setTimeout(resolve, 1500))
                const protRes = await fetchContaAzul(empresaId, `/v1/protocolo/${response.protocolo}`)
                if (protRes?.status === "SUCCESS" && protRes.evento_financeiro_id) {
                    finalPayableId = protRes.evento_financeiro_id
                } else if (protRes?.status === "ERROR") {
                    console.error("[CONTA AZUL PROTOCOL ERROR]", protRes)
                    return { success: false, error: protRes.resposta || "Erro no processamento do lançamento no Conta Azul." }
                }
            } catch (protErr) {
                console.error("[CONTA AZUL PROTOCOL FETCH ERROR]", protErr)
            }
        }

        // 6. Atualiza a Cobertura com o ID gerado e status
        await prisma.cobertura.update({
            where: { id: coberturaId },
            data: {
                contaAzulPayableId: finalPayableId,
                contaAzulStatus: "PENDENTE",
                contaAzulSyncedAt: new Date()
            }
        })

        return {
            success: true,
            payableId: finalPayableId,
            status: "PENDENTE"
        }
    } catch (error: any) {
        console.error("[CONTA AZUL CREATE PAYABLE COBERTURA ERROR]", error)
        return { success: false, error: error.message || "Erro ao criar contas a pagar no Conta Azul." }
    }
}

/**
 * Cria lançamento de Contas a Pagar no Conta Azul a partir de uma Despesa (Reembolso / Adiantamento) aprovada
 */
export async function createPayableFromDespesa(despesaId: string): Promise<ContaAzulPayableResult> {
    try {
        const despesa = await prisma.despesa.findUnique({
            where: { id: despesaId },
            include: {
                solicitante: true,
                centroCusto: true,
                empresa: true
            }
        })

        if (!despesa) {
            return { success: false, error: "Despesa não encontrada." }
        }

        // Se não tiver empresa vinculada, busca a primeira empresa ativa
        let empresaId: string | null = despesa.empresaId
        if (!empresaId) {
            const defaultEmpresa = await prisma.empresa.findFirst({ where: { ativo: true } })
            empresaId = defaultEmpresa?.id || null
            if (empresaId) {
                await prisma.despesa.update({
                    where: { id: despesaId },
                    data: { empresaId }
                })
            }
        }

        if (!empresaId) {
            return { success: false, error: "Nenhuma empresa associada a esta despesa." }
        }

        const config = await prisma.contaAzulConfig.findUnique({
            where: { empresaId }
        })

        if (!config || !config.ativo || !config.autoCriarAoAprovar) {
            return { success: false, error: "Integração Conta Azul inativa para esta empresa." }
        }

        const token = await getValidAccessToken(empresaId)
        if (!token) {
            return { success: false, error: "Empresa não conectada ao Conta Azul (OAuth pendente)." }
        }

        // 1. Busca ou cria o Colaborador como fornecedor/contato no Conta Azul
        const contactResult = await findOrCreateContaAzulContact(empresaId, {
            nome: despesa.solicitante.nome,
            email: despesa.solicitante.email
        })

        const valor = Number(despesa.valorSolicitado)
        const dataHoje = format(new Date(), "yyyy-MM-dd")
        const descricao = `${despesa.tipo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"}: ${despesa.descricao} - Solicitante: ${despesa.solicitante.nome}`

        // Categoria apropriada por tipo
        const categoriaId = despesa.tipo === "REEMBOLSO"
            ? (config.categoriaReembolsoId || config.categoriaDiariaId)
            : (config.categoriaAdiantamentoId || config.categoriaDiariaId)

        const costCenterId = await resolveCostCenterForEmpresa(empresaId, null, config.centroCustoPadraoId)
        const bankAccountId = await resolveFinancialAccountForEmpresa(empresaId, config.contaFinanceiraPadraoId)

        if (!bankAccountId) {
            return { success: false, error: "Nenhuma conta financeira/bancária localizada no Conta Azul para esta empresa." }
        }

        const rateioObj: any = {
            id_categoria: categoriaId,
            valor: valor
        }

        if (costCenterId) {
            rateioObj.rateio_centro_custo = [
                {
                    id_centro_custo: costCenterId,
                    valor: valor
                }
            ]
        }

        const payload: any = {
            data_competencia: dataHoje,
            valor: valor,
            descricao: descricao,
            observacao: `Lançamento via ReembolsaFácil - Despesa ID ${despesa.id.slice(-6).toUpperCase()}`,
            contato: contactResult.contactId,
            conta_financeira: bankAccountId,
            rateio: [rateioObj],
            condicao_pagamento: {
                parcelas: [
                    {
                        descricao: "Parcela 1/1",
                        data_vencimento: dataHoje,
                        nota: "Pagamento via PIX / Transferência",
                        conta_financeira: bankAccountId,
                        metodo_pagamento: "PIX_PAGAMENTO_INSTANTANEO",
                        detalhe_valor: {
                            valor_bruto: valor,
                            valor_liquido: valor
                        }
                    }
                ]
            }
        }

        const response = await fetchContaAzul(empresaId, "/v1/financeiro/eventos-financeiros/contas-a-pagar", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        if (response?.error) {
            return { success: false, error: response.error }
        }

        let finalPayableId = response?.protocolo || response?.id || `CA-DESPESA-${despesa.id.slice(-6).toUpperCase()}`

        if (response?.protocolo) {
            try {
                await new Promise(resolve => setTimeout(resolve, 1500))
                const protRes = await fetchContaAzul(empresaId, `/v1/protocolo/${response.protocolo}`)
                if (protRes?.status === "SUCCESS" && protRes.evento_financeiro_id) {
                    finalPayableId = protRes.evento_financeiro_id
                } else if (protRes?.status === "ERROR") {
                    console.error("[CONTA AZUL PROTOCOL ERROR]", protRes)
                    return { success: false, error: protRes.resposta || "Erro no processamento do lançamento no Conta Azul." }
                }
            } catch (protErr) {
                console.error("[CONTA AZUL PROTOCOL FETCH ERROR]", protErr)
            }
        }

        await prisma.despesa.update({
            where: { id: despesaId },
            data: {
                contaAzulPayableId: finalPayableId,
                contaAzulStatus: "PENDENTE",
                contaAzulSyncedAt: new Date()
            }
        })

        return {
            success: true,
            payableId: finalPayableId,
            status: "PENDENTE"
        }
    } catch (error: any) {
        console.error("[CONTA AZUL CREATE PAYABLE DESPESA ERROR]", error)
        return { success: false, error: error.message || "Erro ao criar contas a pagar no Conta Azul." }
    }
}

/**
 * Consulta Categorias Financeiras no Conta Azul
 */
export async function getContaAzulCategories(empresaId: string) {
    try {
        const res = await fetchContaAzul(empresaId, "/v1/categorias?tamanho_pagina=100")
        if (Array.isArray(res)) return res
        if (res?.itens) return res.itens
        return []
    } catch {
        return []
    }
}

/**
 * Consulta Centros de Custo no Conta Azul
 */
export async function getContaAzulCostCenters(empresaId: string) {
    try {
        const res = await fetchContaAzul(empresaId, "/v1/centro-de-custo?tamanho_pagina=100")
        if (Array.isArray(res)) return res
        if (res?.itens) return res.itens
        return []
    } catch {
        return []
    }
}

/**
 * Consulta Contas Financeiras / Bancos no Conta Azul
 */
export async function getContaAzulBankAccounts(empresaId: string) {
    try {
        const res = await fetchContaAzul(empresaId, "/v1/conta-financeira")
        if (Array.isArray(res)) return res
        if (res?.itens) return res.itens
        return []
    } catch {
        return []
    }
}

/**
 * Sincroniza baixas e pagamentos realizados no Conta Azul para todas as empresas ou uma empresa específica.
 */
export async function syncContaAzulPayables(targetEmpresaId?: string) {
    const whereEmpresa = targetEmpresaId ? { id: targetEmpresaId, ativo: true } : { ativo: true }
    const empresas = await prisma.empresa.findMany({
        where: whereEmpresa,
        include: { contaAzulConfig: true }
    })

    const results = {
        coberturasAtualizadas: 0,
        despesasAtualizadas: 0,
        erros: [] as string[]
    }

    // Garante que o meio de pagamento "Conta Azul (ERP)" exista
    let meioContaAzul = await prisma.meioPagamento.findFirst({
        where: { descricao: { in: ["Conta Azul (ERP)", "Conta Azul", "ERP Conta Azul"] } }
    })
    if (!meioContaAzul) {
        meioContaAzul = await prisma.meioPagamento.create({
            data: { descricao: "Conta Azul (ERP)", ativo: true }
        })
    }

    for (const empresa of empresas) {
        const config = empresa.contaAzulConfig
        if (!config || !config.ativo || !config.accessToken) continue

        try {
            // 1. Busca Diárias (Coberturas) pendentes de pagamento que foram enviadas ao Conta Azul
            const coberturasPendentes = await prisma.cobertura.findMany({
                where: {
                    empresaId: empresa.id,
                    status: "APROVADO",
                    contaAzulPayableId: { not: null }
                },
                include: {
                    diarista: true,
                    posto: true
                }
            })

            for (const cob of coberturasPendentes) {
                if (!cob.contaAzulPayableId) continue

                try {
                    // Consulta as parcelas do evento financeiro no Conta Azul
                    const parcelas = await fetchContaAzul(empresa.id, `/v1/financeiro/eventos-financeiros/${cob.contaAzulPayableId}/parcelas`)
                    const list = Array.isArray(parcelas) ? parcelas : (parcelas?.itens || [])
                    
                    const isPaid = list.length > 0 && list.every((p: any) => 
                        p.status === "PAGO" || p.status === "BAIXADO" || (p.baixas && p.baixas.length > 0) || (p.nao_pago === 0 && p.valor_pago > 0)
                    )

                    if (isPaid) {
                        const dataPagamento = list[0]?.baixas?.[0]?.data_baixa ? new Date(list[0].baixas[0].data_baixa) : new Date()
                        const receiptUrl = `/api/contaazul/comprovante/${cob.contaAzulPayableId}?empresaId=${empresa.id}`

                        const existingAnexo = await prisma.anexo.findFirst({
                            where: { coberturaId: cob.id }
                        })

                        const transactions: any[] = [
                            prisma.cobertura.update({
                                where: { id: cob.id },
                                data: {
                                    status: "PAGO",
                                    dataPagamento,
                                    contaAzulStatus: "PAGO",
                                    contaAzulReceiptUrl: receiptUrl,
                                    contaAzulSyncedAt: new Date(),
                                    meioPagamentoEfetivadoId: meioContaAzul.id
                                }
                            }),
                            prisma.historicoWorkflow.create({
                                data: {
                                    coberturaId: cob.id,
                                    deStatus: "APROVADO",
                                    paraStatus: "PAGO",
                                    usuarioId: cob.supervisorId,
                                    observacao: `[Conta Azul - ${empresa.nome}] Baixa/Pagamento confirmado no ERP. Comprovante anexado automaticamente.`
                                }
                            })
                        ]

                        if (!existingAnexo) {
                            transactions.push(
                                prisma.anexo.create({
                                    data: {
                                        url: receiptUrl,
                                        nomeOriginal: `Comprovante_ContaAzul_${cob.id.slice(-6)}.pdf`,
                                        tamanho: 2048,
                                        tipo: "application/pdf",
                                        usuarioId: cob.supervisorId,
                                        coberturaId: cob.id
                                    }
                                })
                            )
                        }

                        await prisma.$transaction(transactions)
                        results.coberturasAtualizadas++
                    }
                } catch (cobErr: any) {
                    console.error(`[SYNC COBERTURA ERROR ${cob.id}]`, cobErr)
                }
            }

            // 2. Busca Despesas (Reembolsos / Adiantamentos) pendentes
            const despesasPendentes = await prisma.despesa.findMany({
                where: {
                    empresaId: empresa.id,
                    status: "APROVADO",
                    contaAzulPayableId: { not: null }
                },
                include: {
                    solicitante: true
                }
            })

            for (const desp of despesasPendentes) {
                if (!desp.contaAzulPayableId) continue

                try {
                    const parcelas = await fetchContaAzul(empresa.id, `/v1/financeiro/eventos-financeiros/${desp.contaAzulPayableId}/parcelas`)
                    const list = Array.isArray(parcelas) ? parcelas : (parcelas?.itens || [])
                    
                    const isPaid = list.length > 0 && list.every((p: any) => 
                        p.status === "PAGO" || p.status === "BAIXADO" || (p.baixas && p.baixas.length > 0) || (p.nao_pago === 0 && p.valor_pago > 0)
                    )

                    if (isPaid) {
                        const dataPagamento = list[0]?.baixas?.[0]?.data_baixa ? new Date(list[0].baixas[0].data_baixa) : new Date()
                        const receiptUrl = `/api/contaazul/comprovante/${desp.contaAzulPayableId}?empresaId=${empresa.id}`
                        const nextStatus = desp.tipo === "REEMBOLSO" ? "PAGO" : "AGUARDANDO_PRESTACAO"

                        const existingAnexoDesp = await prisma.anexo.findFirst({
                            where: { despesaId: desp.id }
                        })

                        const despTransactions: any[] = [
                            prisma.despesa.update({
                                where: { id: desp.id },
                                data: {
                                    status: nextStatus as any,
                                    dataPagamento,
                                    contaAzulStatus: "PAGO",
                                    contaAzulReceiptUrl: receiptUrl,
                                    contaAzulSyncedAt: new Date()
                                }
                            }),
                            prisma.historicoDespesa.create({
                                data: {
                                    despesaId: desp.id,
                                    deStatus: "APROVADO",
                                    paraStatus: nextStatus as any,
                                    usuarioId: desp.solicitanteId,
                                    observacao: `[Conta Azul - ${empresa.nome}] Baixa/Pagamento confirmado no ERP. Comprovante anexado automaticamente.`
                                }
                            })
                        ]

                        if (!existingAnexoDesp) {
                            despTransactions.push(
                                prisma.anexo.create({
                                    data: {
                                        url: receiptUrl,
                                        nomeOriginal: `Comprovante_ContaAzul_${desp.tipo}_${desp.id.slice(-6)}.pdf`,
                                        tamanho: 2048,
                                        tipo: "application/pdf",
                                        usuarioId: desp.solicitanteId,
                                        despesaId: desp.id
                                    }
                                })
                            )
                        }

                        await prisma.$transaction(despTransactions)
                        results.despesasAtualizadas++
                    }
                } catch (despErr: any) {
                    console.error(`[SYNC DESPESA ERROR ${desp.id}]`, despErr)
                }
            }

            // 3. Auto-recuperação: Coberturas já em PAGO pelo Conta Azul mas sem Anexo ou Meio vinculado
            const coberturasPagasSemAnexo = await prisma.cobertura.findMany({
                where: {
                    empresaId: empresa.id,
                    contaAzulPayableId: { not: null },
                    status: "PAGO",
                    anexos: { none: {} }
                }
            })

            for (const cob of coberturasPagasSemAnexo) {
                try {
                    const receiptUrl = `/api/contaazul/comprovante/${cob.contaAzulPayableId}?empresaId=${empresa.id}`
                    await prisma.cobertura.update({
                        where: { id: cob.id },
                        data: {
                            contaAzulReceiptUrl: receiptUrl,
                            meioPagamentoEfetivadoId: cob.meioPagamentoEfetivadoId || meioContaAzul.id
                        }
                    })
                    await prisma.anexo.create({
                        data: {
                            url: receiptUrl,
                            nomeOriginal: `Comprovante_ContaAzul_${cob.id.slice(-6)}.pdf`,
                            tamanho: 2048,
                            tipo: "application/pdf",
                            usuarioId: cob.supervisorId,
                            coberturaId: cob.id
                        }
                    })
                } catch (recovErr) {
                    console.error(`[AUTO-HEAL COBERTURA ${cob.id}]`, recovErr)
                }
            }

            // Atualiza data da última sincronização
            await prisma.contaAzulConfig.update({
                where: { empresaId: empresa.id },
                data: { ultimaSincronizacao: new Date() }
            })

        } catch (empresaErr: any) {
            console.error(`[SYNC EMPRESA ERROR ${empresa.nome}]`, empresaErr)
            results.erros.push(`${empresa.nome}: ${empresaErr.message}`)
        }
    }

    return results
}
