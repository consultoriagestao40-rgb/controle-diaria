export interface ExtractedCotacaoItem {
    descricao: string
    especificacao?: string
    quantidade: number
    unidade?: string
    precoUnitario: number
    precoTotal: number
}

export interface ExtractedCotacaoData {
    fornecedor?: {
        nome?: string
        cnpj?: string
        email?: string
        telefone?: string
        contato?: string
    }
    condicoesPagamento?: string
    dataVencimento?: string
    emailEnvioNf?: string
    observacoes?: string
    itens: ExtractedCotacaoItem[]
    valorTotal?: number
}

/**
 * Envia o arquivo de cotação (PDF, Imagem ou texto) para o Gemini API extrair itens e preços
 */
export async function extractQuotationWithGemini(
    fileBuffer: Buffer,
    mimeType: string,
    requestedItemsSummary?: string
): Promise<ExtractedCotacaoData> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY não configurada no ambiente.")
    }

    const base64Data = fileBuffer.toString('base64')

    const prompt = `Você é um assistente especialista em compras e suprimentos corporativos.
Analise com extrema precisão este documento de cotação/orçamento ou proposta comercial de fornecedor.

${requestedItemsSummary ? `ATENÇÃO: O solicitante pediu originalmente os seguintes itens:
${requestedItemsSummary}
Tente correlacionar e mapear os itens do documento para atender aos itens solicitados.` : ''}

Extraia as seguintes informações e retorne ESTRITAMENTE um objeto JSON válido (sem blocos de código markdown desnecessários, apenas JSON puro):
{
  "fornecedor": {
    "nome": "Razão social ou nome fantasia do fornecedor",
    "cnpj": "CNPJ formatado se existir",
    "email": "E-mail de contato",
    "telefone": "Telefone de contato",
    "contato": "Nome do vendedor ou representante"
  },
  "condicoesPagamento": "Ex: Boleto 28 dias, 30/60 DDL, À vista, etc.",
  "dataVencimento": "YYYY-MM-DD (se houver vencimento ou validade)",
  "emailEnvioNf": "E-mail indicado para envio de faturamento se houver",
  "observacoes": "Instruções de frete (CIF/FOB), prazo de entrega ou outras regras relevantes",
  "itens": [
    {
      "descricao": "Nome claro do item cotado",
      "especificacao": "Marca, modelo, tamanho, cor ou detalhe",
      "quantidade": 1,
      "unidade": "UN / CX / PAR / PCT / KG / L",
      "precoUnitario": 10.50,
      "precoTotal": 10.50
    }
  ],
  "valorTotal": 0.00
}

Regras:
1. "precoUnitario" e "precoTotal" devem ser números (float com ponto, nunca string com vírgula).
2. Se não encontrar um dado, use null ou omita, mas forneça o máximo possível dos itens e seus preços unitários.
3. Garanta que o JSON seja perfeitamente válido para ser parseado por JSON.parse().`

    // Suporte tanto a modelos 2.5-flash quanto 1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    response_mime_type: "application/json"
                }
            })
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error("Erro na resposta do Gemini API:", response.status, errText)
            // Tenta fallback com gemini-1.5-flash se gemini-2.5-flash der 404
            if (response.status === 404) {
                return await fallbackGemini15(apiKey, prompt, mimeType, base64Data)
            }
            throw new Error(`Falha na API Gemini: ${response.status} - ${errText}`)
        }

        const data = await response.json()
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!textContent) {
            throw new Error("Nenhum conteúdo retornado pelo Gemini.")
        }

        // Limpar possíveis delimitadores ```json ```
        const cleanedText = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
        const parsed: ExtractedCotacaoData = JSON.parse(cleanedText)
        return parsed
    } catch (err: any) {
        console.error("Erro ao extrair cotação com Gemini:", err)
        throw err
    }
}

async function fallbackGemini15(
    apiKey: string,
    prompt: string,
    mimeType: string,
    base64Data: string
): Promise<ExtractedCotacaoData> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                response_mime_type: "application/json"
            }
        })
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Fallback Gemini 1.5 falhou: ${response.status} - ${errText}`)
    }

    const data = await response.json()
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
    const cleanedText = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleanedText)
}
