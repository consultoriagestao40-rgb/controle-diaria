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
    // Celular formato DDI + DDD + Número ou apenas DDD + Número (normalmente inicia com + ou tem tamanho de celular)
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
    error?: string
}

/**
 * Envia uma transferência Pix utilizando a API do Asaas.
 */
export async function sendPixTransfer(params: PixTransferParams): Promise<AsaasTransferResult> {
    const apiKey = process.env.ASAAS_API_KEY || ""
    const apiUrl = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3"

    // Modo Simulado de Homologação (Mock) se a chave de API estiver vazia
    if (!apiKey) {
        console.warn("[ASAAS MOCK] ASAAS_API_KEY não configurada. Simulando Pix de sucesso no Sandbox.");
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simular latência de rede
        return {
            success: true,
            transferId: `mock_asaas_pix_${Math.random().toString(36).substring(7).toUpperCase()}`
        }
    }

    try {
        const pixType = detectPixKeyType(params.chavePix)

        // Para transferência via chave Pix, NÃO enviar bankAccount
        // Conforme docs.asaas.com: bankAccount e pixAddressKey são mutuamente exclusivos
        const requestBody = {
            value: params.valor,
            operationType: "PIX",
            pixAddressKey: params.chavePix,
            pixAddressKeyType: pixType,
            description: params.descricao
        }

        console.log(`[ASAAS] Enviando transferência Pix para ${params.nome} (${pixType}): R$ ${params.valor}`);
        console.log(`[ASAAS] Payload:`, JSON.stringify(requestBody));

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
            const errorMsg = errorData?.errors?.[0]?.description || "Erro desconhecido na API do Asaas."
            console.error("[ASAAS ERROR]", errorData)
            return {
                success: false,
                error: errorMsg
            }
        }

        const responseData = await response.json() as any
        return {
            success: true,
            transferId: responseData.id
        }
    } catch (error: any) {
        console.error("[ASAAS EXCEPTION]", error)
        return {
            success: false,
            error: error.message || "Erro de conexão ao servidor do Asaas."
        }
    }
}
