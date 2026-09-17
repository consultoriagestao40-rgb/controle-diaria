import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBudgetAvailability } from "@/lib/budgethub"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    const costCenterId = searchParams.get("costCenterId")
    const categoryId = searchParams.get("categoryId")
    const mes = parseInt(searchParams.get("mes") || "0", 10)
    const ano = parseInt(searchParams.get("ano") || "0", 10)

    if (!tenantId || !costCenterId || !categoryId || !mes || !ano) {
        return NextResponse.json(
            { error: "Parâmetros obrigatórios ausentes: tenantId, costCenterId, categoryId, mes, ano." },
            { status: 400 }
        )
    }

    try {
        const availability = await getBudgetAvailability({
            tenantId,
            costCenterId,
            categoryId,
            mes,
            ano
        })
        return NextResponse.json(availability)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
