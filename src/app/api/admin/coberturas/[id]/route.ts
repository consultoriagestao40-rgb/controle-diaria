import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
    data: z.string().optional(),
    postoId: z.string().optional(),
    diaristaId: z.string().optional(),
    reservaId: z.string().optional(),
    motivoId: z.string().optional(),
    valor: z.number().optional(),
    empresaId: z.string().optional().nullable() // Allow null to clear if needed, or just optional string
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)

    const user = session?.user as any

    if (!user || user.role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json()
        const { id } = params
        const data = updateSchema.parse(body)

        // Find existing to check if exists
        const existing = await prisma.cobertura.findUnique({
            where: { id }
        })

        if (!existing) {
            return new NextResponse("Cobertura not found", { status: 404 })
        }

        const updateData: any = {}
        if (data.data) updateData.data = new Date(data.data)
        if (data.postoId) updateData.postoId = data.postoId
        if (data.diaristaId) updateData.diaristaId = data.diaristaId
        if (data.reservaId) updateData.reservaId = data.reservaId
        if (data.motivoId) updateData.motivoId = data.motivoId
        if (data.valor !== undefined) updateData.valor = data.valor
        if (data.empresaId !== undefined) updateData.empresaId = data.empresaId

        // Update
        const updated = await prisma.cobertura.update({
            where: { id },
            data: updateData
        })

        // Log History
        await prisma.historicoWorkflow.create({
            data: {
                coberturaId: id,
                usuarioId: user.id,
                paraStatus: existing.status, // Status didn't change, just fields
                observacao: `Edição Administrativa: Dados atualizados.`
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Update error:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
