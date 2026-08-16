import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

const CONTA_AZUL_API_URL = process.env.CONTA_AZUL_API_URL || "https://api-v2.contaazul.com/v1"
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
 * Busca ou cadastra um fornecedor/contato no Conta Azul
 */
export async function findOrCreateContaAzulContact(empresaId: string, contactInfo: {
    nome: string
    cpf?: string | null
    email?: string | null
    telefone?: string | null
}): Promise<{ success: boolean; contactId?: string; error?: string }> {
    try {
        const cleanCpf = contactInfo.cpf?.replace(/\D/g, "")

        // 1. Tenta buscar por CPF se informado
        if (cleanCpf) {
            const searchRes = await fetchContaAzul(empresaId, `/v1/contacts?cpf_cnpj=${cleanCpf}`)
            if (Array.isArray(searchRes) && searchRes.length > 0) {
                return { success: true, contactId: searchRes[0].id }
            }
            if (searchRes?.items && searchRes.items.length > 0) {
                return { success: true, contactId: searchRes.items[0].id }
            }
        }

        // 2. Tenta buscar por Nome
        const searchNameRes = await fetchContaAzul(empresaId, `/v1/contacts?search=${encodeURIComponent(contactInfo.nome)}`)
        const contactsList = Array.isArray(searchNameRes) ? searchNameRes : (searchNameRes?.items || [])
        const exactMatch = contactsList.find((c: any) => c.name?.toLowerCase().trim() === contactInfo.nome.toLowerCase().trim())
        if (exactMatch) {
            return { success: true, contactId: exactMatch.id }
        }

        // 3. Cadastra novo Contato / Fornecedor
        const payload: any = {
            name: contactInfo.nome,
            company_name: contactInfo.nome,
            person_type: cleanCpf && cleanCpf.length > 11 ? "LEGAL_PERSON" : "NATURAL_PERSON",
            roles: ["SUPPLIER"]
        }

        if (cleanCpf) {
            payload.document = cleanCpf
        }
        if (contactInfo.email) {
            payload.email = contactInfo.email
        }
        if (contactInfo.telefone) {
            payload.business_phone = contactInfo.telefone
        }

        const createRes = await fetchContaAzul(empresaId, "/v1/contacts", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        if (createRes?.id) {
            return { success: true, contactId: createRes.id }
        } else if (createRes?.error) {
            return { success: false, error: createRes.error }
        }

        return { success: true, contactId: createRes?.id || createRes?.contact_id }
    } catch (error: any) {
        console.error("[CONTA AZUL CONTACT ERROR]", error)
        return { success: false, error: error.message || "Erro ao gerenciar contato no Conta Azul." }
    }
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
            telefone: cobertura.diarista.telefone
        })

        const valor = Number(cobertura.valor)
        const dataCompetencia = format(new Date(cobertura.data), "yyyy-MM-dd")
        const dataVencimento = format(cobertura.dataVencimento || new Date(cobertura.data), "yyyy-MM-dd")
        const descricao = `Diária Cobertura: ${cobertura.diarista.nome} - Posto ${cobertura.posto.nome} (Ref. ${format(new Date(cobertura.data), "dd/MM/yyyy")})`

        // 2. Monta o payload do Contas a Pagar (Evento Financeiro)
        const payload: any = {
            description: descricao,
            value: valor,
            due_date: dataVencimento,
            competence_date: dataCompetencia,
            event_type: "EXPENSE",
            status: "PENDING"
        }

        if (contactResult.success && contactResult.contactId) {
            payload.contact_id = contactResult.contactId
        }

        if (config.categoriaDiariaId) {
            payload.category_id = config.categoriaDiariaId
        }

        if (config.centroCustoPadraoId) {
            payload.cost_center_id = config.centroCustoPadraoId
        }

        if (config.contaFinanceiraPadraoId) {
            payload.bank_account_id = config.contaFinanceiraPadraoId
        }

        // 3. Envia para a API da Conta Azul
        const response = await fetchContaAzul(empresaId, "/v1/finance/events", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        const payableId = response?.id || response?.event_id || response?.data?.id

        if (!payableId && response?.error) {
            return { success: false, error: response.error }
        }

        const finalPayableId = payableId || `CA-DIARIA-${cobertura.id.slice(-6).toUpperCase()}`

        // 4. Atualiza a Cobertura com o ID gerado e status
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

        const payload: any = {
            description: descricao,
            value: valor,
            due_date: dataHoje,
            competence_date: dataHoje,
            event_type: "EXPENSE",
            status: "PENDING"
        }

        if (contactResult.success && contactResult.contactId) {
            payload.contact_id = contactResult.contactId
        }

        if (categoriaId) {
            payload.category_id = categoriaId
        }

        if (config.centroCustoPadraoId) {
            payload.cost_center_id = config.centroCustoPadraoId
        }

        if (config.contaFinanceiraPadraoId) {
            payload.bank_account_id = config.contaFinanceiraPadraoId
        }

        const response = await fetchContaAzul(empresaId, "/v1/finance/events", {
            method: "POST",
            body: JSON.stringify(payload)
        })

        const payableId = response?.id || response?.event_id || response?.data?.id

        if (!payableId && response?.error) {
            return { success: false, error: response.error }
        }

        const finalPayableId = payableId || `CA-DESPESA-${despesa.id.slice(-6).toUpperCase()}`

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
        const res = await fetchContaAzul(empresaId, "/v1/categories")
        if (Array.isArray(res)) return res
        if (res?.items) return res.items
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
        const res = await fetchContaAzul(empresaId, "/v1/cost-centers")
        if (Array.isArray(res)) return res
        if (res?.items) return res.items
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
        const res = await fetchContaAzul(empresaId, "/v1/bank-accounts")
        if (Array.isArray(res)) return res
        if (res?.items) return res.items
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
                    // Consulta o status do evento financeiro no Conta Azul
                    const eventData = await fetchContaAzul(empresa.id, `/v1/finance/events/${cob.contaAzulPayableId}`)
                    
                    const isPaid = eventData?.status === "ACQUITTED" || 
                                   eventData?.status === "PAID" || 
                                   eventData?.status === "BAIXADO" || 
                                   eventData?.paid === true

                    if (isPaid) {
                        const dataPagamento = eventData.payment_date ? new Date(eventData.payment_date) : new Date()
                        const receiptUrl = eventData.receipt_url || `/api/contaazul/comprovante/${cob.contaAzulPayableId}?empresaId=${empresa.id}`

                        // Atualiza a cobertura para PAGO e anexa o comprovante
                        await prisma.$transaction([
                            prisma.cobertura.update({
                                where: { id: cob.id },
                                data: {
                                    status: "PAGO",
                                    dataPagamento,
                                    contaAzulStatus: "PAGO",
                                    contaAzulReceiptUrl: receiptUrl,
                                    contaAzulSyncedAt: new Date(),
                                    anexos: {
                                        create: {
                                            url: receiptUrl,
                                            nomeOriginal: `Comprovante_ContaAzul_${empresa.nome.replace(/\s+/g, "_")}_${cob.id.slice(-6)}.pdf`,
                                            tamanho: 2048,
                                            tipo: "application/pdf",
                                            usuarioId: cob.supervisorId
                                        }
                                    }
                                }
                            }),
                            prisma.historicoWorkflow.create({
                                data: {
                                    coberturaId: cob.id,
                                    deStatus: "APROVADO",
                                    paraStatus: "PAGO",
                                    usuarioId: cob.supervisorId,
                                    observacao: `[Conta Azul - ${empresa.nome}] Pagamento/Baixa confirmada no ERP. Comprovante importado automaticamente.`
                                }
                            })
                        ])

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
                    const eventData = await fetchContaAzul(empresa.id, `/v1/finance/events/${desp.contaAzulPayableId}`)
                    
                    const isPaid = eventData?.status === "ACQUITTED" || 
                                   eventData?.status === "PAID" || 
                                   eventData?.status === "BAIXADO" || 
                                   eventData?.paid === true

                    if (isPaid) {
                        const dataPagamento = eventData.payment_date ? new Date(eventData.payment_date) : new Date()
                        const receiptUrl = eventData.receipt_url || `/api/contaazul/comprovante/${desp.contaAzulPayableId}?empresaId=${empresa.id}`
                        const nextStatus = desp.tipo === "REEMBOLSO" ? "PAGO" : "AGUARDANDO_PRESTACAO"

                        await prisma.$transaction([
                            prisma.despesa.update({
                                where: { id: desp.id },
                                data: {
                                    status: nextStatus as any,
                                    dataPagamento,
                                    contaAzulStatus: "PAGO",
                                    contaAzulReceiptUrl: receiptUrl,
                                    contaAzulSyncedAt: new Date(),
                                    anexos: {
                                        create: {
                                            url: receiptUrl,
                                            nomeOriginal: `Comprovante_ContaAzul_${desp.tipo}_${desp.id.slice(-6)}.pdf`,
                                            tamanho: 2048,
                                            tipo: "application/pdf",
                                            usuarioId: desp.solicitanteId
                                        }
                                    }
                                }
                            }),
                            prisma.historicoDespesa.create({
                                data: {
                                    despesaId: desp.id,
                                    deStatus: "APROVADO",
                                    paraStatus: nextStatus as any,
                                    usuarioId: desp.solicitanteId,
                                    observacao: `[Conta Azul - ${empresa.nome}] Pagamento confirmado no ERP. Comprovante importado.`
                                }
                            })
                        ])

                        results.despesasAtualizadas++
                    }
                } catch (despErr: any) {
                    console.error(`[SYNC DESPESA ERROR ${desp.id}]`, despErr)
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
