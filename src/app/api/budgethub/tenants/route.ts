import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBudgetHubTenants } from "@/lib/budgethub"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const tenants = await getBudgetHubTenants()
        return NextResponse.json(tenants)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
