import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import ExcelJS from "exceljs"
import { extractTextFromPdfBuffer } from "@/lib/gemini-parser"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const fileName = file.name.toLowerCase()

        const itensExtraidos: Array<{
            categoriaPai?: string
            categoriaFilho?: string
            descricao: string
            especificacao?: string
            marca?: string
            tamanho?: string
            quantidade: number
            unidade: string
        }> = []

        // 1. Processar arquivo Excel (.xlsx, .xls, .csv)
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer as any)

            const worksheet = workbook.worksheets[0]
            if (!worksheet) {
                return NextResponse.json({ error: "Planilha sem abas válidas." }, { status: 400 })
            }

            let headerMap: Record<string, number> = {}
            let headerRowIndex = 1

            // Procura linha de cabeçalho nas primeiras 10 linhas
            for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
                const row = worksheet.getRow(r)
                const values = row.values as any[]
                if (!values) continue

                let foundDesc = false
                const tempMap: Record<string, number> = {}

                for (let c = 1; c < values.length; c++) {
                    const cellVal = String(values[c] || "").toLowerCase().trim()
                    if (cellVal.includes("descri") || cellVal.includes("item") || cellVal.includes("produto")) {
                        foundDesc = true
                        tempMap["descricao"] = c
                    } else if (cellVal.includes("cat") && (cellVal.includes("pai") || cellVal.includes("grupo"))) {
                        tempMap["categoriaPai"] = c
                    } else if (cellVal.includes("sub") || cellVal.includes("filho") || cellVal.includes("conta")) {
                        tempMap["categoriaFilho"] = c
                    } else if (cellVal.includes("espec") || cellVal.includes("ca")) {
                        tempMap["especificacao"] = c
                    } else if (cellVal.includes("marca")) {
                        tempMap["marca"] = c
                    } else if (cellVal.includes("tam")) {
                        tempMap["tamanho"] = c
                    } else if (cellVal.includes("qtd") || cellVal.includes("quant")) {
                        tempMap["quantidade"] = c
                    } else if (cellVal.includes("unid") || cellVal.includes("un")) {
                        tempMap["unidade"] = c
                    }
                }

                if (foundDesc) {
                    headerMap = tempMap
                    headerRowIndex = r
                    break
                }
            }

            // Se não encontrou cabeçalho explícito, assume colunas padrão: 1: Descrição, 2: Especificação/CA, 3: Marca, 4: Tamanho, 5: Qtd, 6: Unidade
            if (!headerMap["descricao"]) {
                headerMap = {
                    descricao: 1,
                    especificacao: 2,
                    marca: 3,
                    tamanho: 4,
                    quantidade: 5,
                    unidade: 6
                }
                headerRowIndex = 1
            }

            for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
                const row = worksheet.getRow(r)
                const descVal = String(row.getCell(headerMap["descricao"]).value || "").trim()
                if (!descVal || descVal.toLowerCase() === "total" || descVal.length < 2) continue

                const qtdVal = Number(row.getCell(headerMap["quantidade"] || 0).value) || 1
                const unidVal = String(row.getCell(headerMap["unidade"] || 0).value || "UN").toUpperCase().trim()
                const especVal = headerMap["especificacao"] ? String(row.getCell(headerMap["especificacao"]).value || "").trim() : ""
                const marcaVal = headerMap["marca"] ? String(row.getCell(headerMap["marca"]).value || "").trim() : ""
                const tamVal = headerMap["tamanho"] ? String(row.getCell(headerMap["tamanho"]).value || "").trim() : ""
                const catPaiVal = headerMap["categoriaPai"] ? String(row.getCell(headerMap["categoriaPai"]).value || "").trim() : ""
                const catFilhoVal = headerMap["categoriaFilho"] ? String(row.getCell(headerMap["categoriaFilho"]).value || "").trim() : ""

                itensExtraidos.push({
                    categoriaPai: catPaiVal || undefined,
                    categoriaFilho: catFilhoVal || undefined,
                    descricao: descVal,
                    especificacao: especVal || undefined,
                    marca: marcaVal || undefined,
                    tamanho: tamVal || undefined,
                    quantidade: isNaN(qtdVal) || qtdVal <= 0 ? 1 : qtdVal,
                    unidade: unidVal || "UN"
                })
            }
        }
        // 2. Processar arquivo PDF
        else if (fileName.endsWith(".pdf") || file.type.includes("pdf")) {
            const rawText = extractTextFromPdfBuffer(buffer)
            const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 2)

            for (const line of lines) {
                // Tenta encontrar linhas que iniciam com número ou contêm quantidade
                // Ex: "1 Luva nitrílica cano longo tam G 10 UN" ou "Detergente neutro 5L - 5 GL"
                if (
                    line.toLowerCase().includes("pedido") ||
                    line.toLowerCase().includes("data") ||
                    line.toLowerCase().includes("página") ||
                    line.toLowerCase().includes("cnpj")
                ) {
                    continue
                }

                // Detecta padrão de quantidade + unidade
                const matchQtd = line.match(/(\d+)\s*(UN|PAR|CX|PCT|L|KG|KIT|MT|ROLO|GL)\b/i)
                let qtd = 1
                let unid = "UN"
                let desc = line

                if (matchQtd) {
                    qtd = Number(matchQtd[1]) || 1
                    unid = matchQtd[2].toUpperCase()
                    desc = line.replace(matchQtd[0], "").trim()
                }

                // Remove numeração inicial tipo "1.", "01 - "
                desc = desc.replace(/^\d+[\.\-\)]\s*/, "").trim()

                if (desc.length >= 3) {
                    itensExtraidos.push({
                        descricao: desc,
                        quantidade: qtd,
                        unidade: unid
                    })
                }

                if (itensExtraidos.length >= 100) break
            }
        }

        if (itensExtraidos.length === 0) {
            return NextResponse.json(
                { error: "Nenhum item reconhecido no arquivo. Verifique o formato e as colunas do documento." },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            totalItens: itensExtraidos.length,
            itens: itensExtraidos
        })
    } catch (err: any) {
        console.error("Erro ao importar itens de arquivo:", err)
        return NextResponse.json(
            { error: err.message || "Falha ao processar arquivo para importação de itens." },
            { status: 500 }
        )
    }
}
