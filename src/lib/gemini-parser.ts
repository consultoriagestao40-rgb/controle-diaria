import * as zlib from "zlib"

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
 * Extrai texto legível de um arquivo PDF utilizando descompactação de streams em Node puro
 */
export function extractTextFromPdfBuffer(pdfBuffer: Buffer): string {
    try {
        const content = pdfBuffer.toString("binary")
        let text = ""

        // Localiza streams do PDF
        const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g
        let match
        while ((match = streamRegex.exec(content)) !== null) {
            const rawStream = Buffer.from(match[1], "binary")
            let decompressed: Buffer | null = null
            try {
                decompressed = zlib.inflateSync(rawStream)
            } catch {
                decompressed = rawStream
            }

            if (decompressed) {
                const str = decompressed.toString("latin1")
                // Procura textos entre parênteses: (Texto) Tj ou [(T1)(T2)] TJ
                const tjMatches = str.match(/\(([^)]+)\)\s*Tj/g) || []
                for (const m of tjMatches) {
                    const val = m.replace(/^\(/, "").replace(/\)\s*Tj$/, "")
                    text += val + " "
                }
                const tjArrayMatches = str.match(/\[([^\]]+)\]\s*TJ/g) || []
                for (const m of tjArrayMatches) {
                    const inner = m.match(/\(([^)]+)\)/g) || []
                    for (const inM of inner) {
                        text += inM.slice(1, -1) + " "
                    }
                }
            }
        }

        // Se o PDF não tinha streams compactados padrão, tenta pegar strings puras
        if (!text.trim()) {
            const plainStrings = content.match(/\(([^)]+)\)/g) || []
            text = plainStrings.map(s => s.slice(1, -1)).filter(s => s.length > 2).join(" ")
        }

        return text.trim()
    } catch (e) {
        console.warn("Aviso ao extrair texto do PDF:", e)
        return ""
    }
}

/**
 * Analisador heurístico local para orçamentos e propostas (executado quando IA não estiver disponível)
 */
export function parseQuotationLocally(
    rawText: string,
    requestedItemsSummary?: string
): ExtractedCotacaoData {
    const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)

    // 1. Extração do Fornecedor
    let cnpj: string | undefined
    const cnpjMatch = rawText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
    if (cnpjMatch) cnpj = cnpjMatch[0]

    let email: string | undefined
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (emailMatch) email = emailMatch[0]

    let telefone: string | undefined
    const telMatch = rawText.match(/(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/)
    if (telMatch) telefone = telMatch[0]

    let fornecedorNome = "Fornecedor da Cotação"
    for (const line of lines.slice(0, 10)) {
        if (
            line.length > 3 &&
            !line.toLowerCase().includes("proposta") &&
            !line.toLowerCase().includes("orçamento") &&
            !line.toLowerCase().includes("data") &&
            !line.toLowerCase().includes("cnpj")
        ) {
            fornecedorNome = line
            break
        }
    }

    // 2. Extração dos Itens e Preços
    const itens: ExtractedCotacaoItem[] = []

    // Procura por linhas que tenham descrição + quantidade + valor monetário
    // Exemplo: "Luva nitrílica 10 UN 12,50 125,00" ou "1. Luva R$ 15,00"
    const priceRegex = /(?:R\$\s*)?(\d{1,4}(?:[.,]\d{3})*[.,]\d{2})/g

    if (requestedItemsSummary) {
        const reqLines = requestedItemsSummary.split("\n").filter(Boolean)
        for (const reqLine of reqLines) {
            // Tenta achar menção na cotação
            const cleanDesc = reqLine.replace(/^\d+[\.\-\)]\s*/, "").split("(")[0].trim()
            if (!cleanDesc) continue

            // Busca se o texto do PDF contém essa descrição
            const idx = rawText.toLowerCase().indexOf(cleanDesc.toLowerCase().slice(0, 15))
            let precoUnit = 0
            if (idx !== -1) {
                const snippet = rawText.slice(idx, idx + 150)
                const matches = [...snippet.matchAll(priceRegex)]
                if (matches.length > 0) {
                    precoUnit = Number(matches[0][1].replace(/\./g, "").replace(",", ".")) || 0
                }
            }

            itens.push({
                descricao: cleanDesc,
                quantidade: 1,
                unidade: "UN",
                precoUnitario: precoUnit || 0,
                precoTotal: precoUnit || 0
            })
        }
    }

    // Se não gerou itens com requestedItemsSummary, tenta extrair linhas com preços
    if (itens.length === 0) {
        for (const line of lines) {
            const matches = [...line.matchAll(priceRegex)]
            if (matches.length > 0 && line.length > 6) {
                const val = Number(matches[0][1].replace(/\./g, "").replace(",", "."))
                if (val > 0) {
                    const desc = line.replace(priceRegex, "").replace(/\b(UN|PAR|CX|PCT|KG|L)\b/gi, "").trim()
                    if (desc.length > 3) {
                        itens.push({
                            descricao: desc,
                            quantidade: 1,
                            unidade: "UN",
                            precoUnitario: val,
                            precoTotal: val
                        })
                    }
                }
            }
            if (itens.length >= 20) break
        }
    }

    const valorTotal = itens.reduce((acc, it) => acc + (it.precoTotal || 0), 0)

    return {
        fornecedor: {
            nome: fornecedorNome,
            cnpj,
            email,
            telefone
        },
        condicoesPagamento: "A definir na cotação",
        itens: itens.length > 0 ? itens : [
            {
                descricao: "Item cotado no documento",
                quantidade: 1,
                unidade: "UN",
                precoUnitario: valorTotal || 0,
                precoTotal: valorTotal || 0
            }
        ],
        valorTotal
    }
}

/**
 * Envia o arquivo de cotação para o Gemini API extrair itens e preços com fallback automático local
 */
export async function extractQuotationWithGemini(
    fileBuffer: Buffer,
    mimeType: string,
    requestedItemsSummary?: string
): Promise<ExtractedCotacaoData> {
    const apiKey = process.env.GEMINI_API_KEY

    // Se houver chave API válida da Google AI (geralmente começa com AIza), tenta via API
    if (apiKey && apiKey.startsWith("AIza")) {
        try {
            const base64Data = fileBuffer.toString('base64')
            const prompt = `Você é um assistente especialista em compras e suprimentos corporativos.
Analise com extrema precisão este documento de cotação/orçamento ou proposta comercial de fornecedor.

${requestedItemsSummary ? `ATENÇÃO: O solicitante pediu originalmente os seguintes itens:
${requestedItemsSummary}
Tente correlacionar e mapear os itens do documento para atender aos itens solicitados.` : ''}

Extraia as seguintes informações e retorne ESTRITAMENTE um objeto JSON válido:
{
  "fornecedor": {
    "nome": "Razão social ou nome fantasia do fornecedor",
    "cnpj": "CNPJ formatado se existir",
    "email": "E-mail de contato",
    "telefone": "Telefone de contato",
    "contato": "Nome do vendedor ou representante"
  },
  "condicoesPagamento": "Ex: Boleto 28 dias, 30/60 DDL, À vista, etc.",
  "dataVencimento": "YYYY-MM-DD",
  "emailEnvioNf": "E-mail indicado para envio de faturamento se houver",
  "observacoes": "Instruções de frete, prazo de entrega",
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
}`

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

            if (response.ok) {
                const data = await response.json()
                const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
                if (textContent) {
                    const cleanedText = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
                    return JSON.parse(cleanedText)
                }
            }
        } catch (apiErr) {
            console.warn("Aviso: Falha na chamada da API Gemini, usando extrator local:", apiErr)
        }
    }

    // Fallback: extração direta do texto do arquivo PDF ou texto
    let extractedText = ""
    if (mimeType.includes("pdf")) {
        extractedText = extractTextFromPdfBuffer(fileBuffer)
    } else {
        extractedText = fileBuffer.toString("utf-8")
    }

    return parseQuotationLocally(extractedText, requestedItemsSummary)
}
