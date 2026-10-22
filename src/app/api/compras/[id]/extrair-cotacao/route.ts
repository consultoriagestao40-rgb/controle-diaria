import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { extractQuotationWithGemini } from "@/lib/gemini-parser"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { id } = await params

    try {
        const pedido = await prisma.pedidoCompra.findUnique({
            where: { id },
            include: { itens: true }
        })

        if (!pedido) {
            return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
        }

        // Ler buffer do arquivo
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Converter arquivo para Data URL base64 seguro para Vercel
        const base64Data = buffer.toString("base64")
        const fileUrl = `data:${file.type || "application/pdf"};base64,${base64Data}`

        // Resumir os itens solicitados para passar como contexto ao Gemini
        const requestedSummary = pedido.itens
            .map((item, idx) => `${idx + 1}. ${item.descricao} (Qtd: ${item.quantidade} ${item.unidade || 'UN'})`)
            .join("\n")

        // Extrair dados com Gemini IA
        const extractedData = await extractQuotationWithGemini(
            buffer,
            file.type || "application/pdf",
            requestedSummary
        )

        return NextResponse.json({
            success: true,
            fileUrl,
            fileName: file.name,
            extractedData
        })
    } catch (error: any) {
        console.error("Erro ao extrair cotação com Gemini:", error)
        return NextResponse.json(
            { error: error.message || "Falha ao processar arquivo com inteligência artificial." },
            { status: 500 }
        )
    }
}
