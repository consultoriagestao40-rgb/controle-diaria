import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBudgetHubCostCenters } from "@/lib/budgethub"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId") || undefined

    try {
        const costCenters = await getBudgetHubCostCenters(tenantId)
        return NextResponse.json(costCenters)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
