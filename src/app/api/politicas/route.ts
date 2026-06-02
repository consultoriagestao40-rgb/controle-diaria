import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile } from "fs/promises"
import { join } from "path"

// GET: Retornar políticas e termos configurados
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const politicas = await prisma.politicaDespesa.findMany({
            orderBy: { categoria: 'asc' }
        })

        let auditoria = await prisma.configuracaoAuditoria.findFirst({
            where: { ativo: true }
        })

        if (!auditoria) {
            auditoria = await prisma.configuracaoAuditoria.create({
                data: {
                    palavrasProibidas: "cerveja,energetico,preservativo,chiclete,bala,doce,bebida"
                }
            })
        }

        return NextResponse.json({ politicas, auditoria })
    } catch (error) {
        console.error("Erro ao buscar políticas:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Criar ou Atualizar políticas de despesas e termos de auditoria (Apenas ADMIN)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        let body: any = {}
        let fileToUpload: File | null = null

        const contentType = req.headers.get("content-type") || ""
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData()
            body.tipoConfig = formData.get("tipoConfig") as string
            body.categoria = formData.get("categoria") as string | undefined
            body.limiteValor = formData.get("limiteValor") as string | undefined
            body.descricao = formData.get("descricao") as string | undefined
            body.palavrasProibidas = formData.get("palavrasProibidas") as string | undefined
            body.motivosRejeicao = formData.get("motivosRejeicao") as string | undefined
            body.logoPersonalizado = formData.get("logoPersonalizado") as string | undefined // can be URL, "null" string, or undefined
            fileToUpload = formData.get("logoFile") as File | null
        } else {
            body = await req.json()
        }

        const { tipoConfig, categoria, limiteValor, descricao, palavrasProibidas, motivosRejeicao } = body
        let logoPersonalizado = body.logoPersonalizado

        if (tipoConfig === "AUDITORIA") {
            // Process logo file if uploaded
            if (fileToUpload) {
                const bytes = await fileToUpload.arrayBuffer()
                const buffer = Buffer.from(bytes)

                const uploadDir = join(process.cwd(), "public", "uploads")
                const filename = `logo-${Date.now()}-${fileToUpload.name.replace(/\s/g, '_')}`
                const filepath = join(uploadDir, filename)

                await writeFile(filepath, buffer)
                logoPersonalizado = `/uploads/${filename}`
            } else if (logoPersonalizado === "null" || logoPersonalizado === null) {
                logoPersonalizado = null
            }

            if (palavrasProibidas === undefined && motivosRejeicao === undefined && logoPersonalizado === undefined && !fileToUpload) {
                return new NextResponse(
                    JSON.stringify({ error: "Pelo menos um dos campos ('palavrasProibidas', 'motivosRejeicao', 'logoPersonalizado' ou arquivo de logo) deve ser informado." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            // Atualiza ou cria as configurações de palavras, motivos e logo
            const current = await prisma.configuracaoAuditoria.findFirst({
                where: { ativo: true }
            })

            const dataToUpdate: any = {}
            if (palavrasProibidas !== undefined) dataToUpdate.palavrasProibidas = palavrasProibidas
            if (motivosRejeicao !== undefined) dataToUpdate.motivosRejeicao = motivosRejeicao
            if (logoPersonalizado !== undefined || fileToUpload) dataToUpdate.logoPersonalizado = logoPersonalizado

            let result
            if (current) {
                result = await prisma.configuracaoAuditoria.update({
                    where: { id: current.id },
                    data: dataToUpdate
                })
            } else {
                result = await prisma.configuracaoAuditoria.create({
                    data: {
                        palavrasProibidas: palavrasProibidas || "cerveja,energetico,preservativo,chiclete,bala,doce,bebida",
                        motivosRejeicao: motivosRejeicao || "Fora da política,Despesas não autorizada,Comprovante ilegível,Outros",
                        logoPersonalizado: logoPersonalizado || null
                    }
                })
            }

            return NextResponse.json(result)
        } else if (tipoConfig === "LIMITE") {
            if (!categoria || limiteValor === undefined || !descricao) {
                return new NextResponse(
                    JSON.stringify({ error: "Campos 'categoria', 'limiteValor' e 'descricao' são obrigatórios." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            const valor = parseFloat(limiteValor)
            if (isNaN(valor) || valor < 0) {
                return new NextResponse(
                    JSON.stringify({ error: "Limite de valor inválido." }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                )
            }

            const result = await prisma.politicaDespesa.upsert({
                where: { categoria },
                update: { limiteValor: valor, descricao },
                create: { categoria, limiteValor: valor, descricao }
            })

            return NextResponse.json(result)
        } else {
            return new NextResponse(
                JSON.stringify({ error: "Tipo de configuração inválido. Use 'AUDITORIA' ou 'LIMITE'." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }
    } catch (error) {
        console.error("Erro ao salvar política:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

