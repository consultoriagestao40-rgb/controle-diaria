import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        // Transaction to ensure atomicity and correct order
        await prisma.$transaction(async (tx) => {
            // 1. Delete History (Dependent on Cobertura)
            await tx.historicoWorkflow.deleteMany({})

            // 2. Delete Attachments LINKED to Coberturas
            // We assume attachments not linked are either orphans or irrelevant for this "reset"
            // or we could delete all attachments if they are purely transactional. 
            // Safer to delete those with coberturaId not null to avoid deleting unrelated uploads if any.
            // But if we delete Cobertura, we MUST delete these first or set null.
            await tx.anexo.deleteMany({
                where: {
                    coberturaId: { not: null }
                }
            })

            // 3. Delete Coberturas (The main cleaning target)
            await tx.cobertura.deleteMany({})
        })

        console.log(`[System Reset] User ${user.email} cleared all transaction data.`)

        return NextResponse.json({ message: "Dados limpos com sucesso" })
    } catch (error) {
        console.error("[Reset API Error]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
