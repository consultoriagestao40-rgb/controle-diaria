import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile } from "fs/promises"
import { join } from "path"

// GET: List items waiting for payment (Status = APROVADO) + Payment Methods
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const pendencias = await prisma.cobertura.findMany({
            where: { status: 'APROVADO' },
            include: {
                posto: true,
                diarista: true,
                motivo: true,
                meioPagamentoSolicitado: true,
                supervisor: { select: { nome: true } },
                aprovadorN1: { select: { nome: true } },
                aprovador: { select: { nome: true } }
            },
            orderBy: { data: 'asc' }
        })

        const meios = await prisma.meioPagamento.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        })

        return NextResponse.json({ items: pendencias, meios })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

// POST: Execute Payment (Status -> PAGO) with File Upload
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const formData = await req.formData()
        const id = formData.get("id") as string
        const dataPagamento = formData.get("dataPagamento") as string
        const meioPagamentoId = formData.get("meioPagamentoId") as string
        const justificativa = formData.get("justificativa") as string
        const file = formData.get("comprovante") as File | null

        if (!id || !dataPagamento || !meioPagamentoId) {
            return new NextResponse("Missing fields", { status: 400 })
        }

        // Handle File Upload if present
        let anexoData = undefined
        if (file) {
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Ensure directory exists (basic check, assume public/uploads exists or create)
            // Check "public/uploads"
            const uploadDir = join(process.cwd(), "public", "uploads")
            // Note: In production Vercel, local filesystem is not persistent. 
            // But for this "local dev" focused task, saving to public/uploads works.
            // We'll use a simple timestamp name
            const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
            const filepath = join(uploadDir, filename)

            await writeFile(filepath, buffer)

            anexoData = {
                create: {
                    url: `/uploads/${filename}`,
                    nomeOriginal: file.name,
                    tamanho: file.size,
                    tipo: file.type,
                    usuarioId: user.id
                }
            }
        }

        await prisma.$transaction([
            prisma.cobertura.update({
                where: { id },
                data: {
                    status: 'PAGO',
                    dataPagamento: new Date(dataPagamento),
                    meioPagamentoEfetivadoId: meioPagamentoId,
                    justificativaPagamento: justificativa,
                    financeiroId: user.id,
                    anexos: anexoData // Link the new attachment
                }
            }),
            prisma.historicoWorkflow.create({
                data: {
                    coberturaId: id,
                    deStatus: 'APROVADO',
                    paraStatus: 'PAGO',
                    usuarioId: user.id,
                    observacao: `Pagamento realizado via ${meioPagamentoId}. ${file ? 'Comprovante anexado.' : ''}`
                }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
