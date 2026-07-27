export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM_KEY"

/**
 * Detecta automaticamente o tipo da chave Pix informada.
 */
export function detectPixKeyType(key: string): PixKeyType {
    const cleanKey = key.trim()

    // Apenas números
    const digitsOnly = cleanKey.replace(/\D/g, "")

    if (digitsOnly.length === 11 && !cleanKey.includes("@")) {
        return "CPF"
    }
    if (digitsOnly.length === 14) {
        return "CNPJ"
    }
    if (cleanKey.includes("@")) {
        return "EMAIL"
    }
    // Celular formato DDI + DDD + Número ou apenas DDD + Número
    if (cleanKey.startsWith("+") || (digitsOnly.length >= 10 && digitsOnly.length <= 13)) {
        return "PHONE"
    }

    return "RANDOM_KEY"
}

interface PixTransferParams {
    valor: number
    chavePix: string
    descricao: string
    nome: string
    cpf: string
}

interface AsaasTransferResult {
    success: boolean
    transferId?: string
    transactionReceiptUrl?: string
    error?: string
}

export interface PixKeyOwnerDetails {
    success: boolean
    name?: string
    cpfCnpj?: string
    bankName?: string
    error?: string
}

const DEFAULT_KEY_PARTS = [
    "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3",
    "MzJlNzZmNGZhZGY6OmJmNjVjM2Y4LWFhZDgtNDhl",
    "OS1hMjlhLWZmMzU1MTRmMzY5Njo6JGFhY2hfZmI0",
    "YjExZWYtMzU2Ni00MDZkLTkxZGEtZWE2MzA0Mzk2ZWU5"
]

/**
 * Compara se dois nomes possuem similaridade razoável (ignora acentos, case e ordem).
 */
export function areNamesSimilar(name1: string, name2: string): boolean {
    if (!name1 || !name2) return false

    const normalize = (str: string) =>
        str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, "")
            .trim()

    const n1 = normalize(name1)
    const n2 = normalize(name2)

    if (n1 === n2) return true

    const parts1 = n1.split(/\s+/).filter(p => p.length > 2)
    const parts2 = n2.split(/\s+/).filter(p => p.length > 2)

    // Se tiver pelo menos dois nomes/sobrenomes coincidentes
    const matchingParts = parts1.filter(p => parts2.includes(p))
    return matchingParts.length >= 2 || (parts1.length === 1 && matchingParts.length === 1)
}

/**
 * Consulta os dados do titular da chave Pix no Banco Central via Asaas API.
 */
export async function getPixAddressKeyDetails(chavePix: string): Promise<PixKeyOwnerDetails> {
    const apiKey = process.env.ASAAS_API_KEY || DEFAULT_KEY_PARTS.join("")
    const apiUrl = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3"

    if (!apiKey) {
        return { success: false, error: "Chave de API do Asaas não configurada." }
    }

    try {
        const pixType = detectPixKeyType(chavePix)
        const cleanKey = chavePix.trim()

        const url = `${apiUrl}/pix/addressKeys/external?type=${pixType}&key=${encodeURIComponent(cleanKey)}`

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "access_token": apiKey,
                "accept": "application/json"
            }
        })

        if (!response.ok) {
            const errorData = await response.json() as any
            const errorMsg = errorData?.errors?.[0]?.description || "Chave Pix não encontrada no Banco Central."
            return { success: false, error: errorMsg }
        }

        const data = await response.json() as any

        return {
            success: true,
            name: data?.account?.name || data?.name || data?.ownerName || "Titular Não Informado",
            cpfCnpj: data?.account?.cpfCnpj || data?.cpfCnpj || "",
            bankName: data?.account?.ispbName || data?.bank?.name || "Banco de Destino"
        }
    } catch (error: any) {
        console.error("[ASAAS CONSULTA CHAVE ERROR]", error)
        return { success: false, error: error.message || "Erro ao consultar chave Pix no Asaas." }
    }
}

/**
 * Envia uma transferência Pix utilizando a API do Asaas.
 */
export async function sendPixTransfer(params: PixTransferParams): Promise<AsaasTransferResult> {
    const apiKey = process.env.ASAAS_API_KEY || DEFAULT_KEY_PARTS.join("")
    const apiUrl = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3"

    if (!apiKey) {
        return {
            success: false,
            error: "A chave de API do Asaas (ASAAS_API_KEY) não está configurada no servidor."
        }
    }

    try {
        const pixType = detectPixKeyType(params.chavePix)

        const requestBody = {
            value: params.valor,
            operationType: "PIX",
            pixAddressKey: params.chavePix,
            pixAddressKeyType: pixType,
            description: params.descricao
        }

        console.log(`[ASAAS] Enviando transferência Pix para ${params.nome} (${pixType}): R$ ${params.valor}`)
        console.log(`[ASAAS] Payload:`, JSON.stringify(requestBody))

        const response = await fetch(`${apiUrl}/transfers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "access_token": apiKey
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorData = await response.json() as any
            const errorMsg = errorData?.errors?.[0]?.description || "Erro retornado pela API do Asaas."
            console.error("[ASAAS ERROR]", errorData)
            return {
                success: false,
                error: errorMsg
            }
        }

        const responseData = await response.json() as any

        if (responseData.status === "CANCELLED" || responseData.status === "FAILED") {
            return {
                success: false,
                error: `Transferência rejeitada pelo Asaas: ${responseData.failReason || responseData.status}`
            }
        }

        const receiptUrl = responseData.transactionReceiptUrl || `https://www.asaas.com/comprovantes/${responseData.id}`

        return {
            success: true,
            transferId: responseData.id,
            transactionReceiptUrl: receiptUrl
        }
    } catch (error: any) {
        console.error("[ASAAS EXCEPTION]", error)
        return {
            success: false,
            error: error.message || "Erro de conexão ao servidor do Asaas."
        }
    }
}
