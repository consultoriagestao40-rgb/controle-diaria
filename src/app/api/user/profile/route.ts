import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = (session.user as any).id
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                avatarUrl: true
            }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error: any) {
        console.error("GET PROFILE ERROR:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = (session.user as any).id
        
        let name: string | null = null
        let avatarUrl: string | null = null
        
        const contentType = req.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
            const body = await req.json()
            name = body.name || null
            avatarUrl = body.avatarUrl || null
        } else {
            const formData = await req.formData()
            name = formData.get("name") as string | null
            const file = formData.get("file") as File | null

            if (file) {
                const bytes = await file.arrayBuffer()
                const buffer = Buffer.from(bytes)
                const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`
                avatarUrl = base64Data
            }
        }

        const updateData: any = {}
        if (name !== null) updateData.nome = name
        if (avatarUrl !== null) updateData.avatarUrl = avatarUrl

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                avatarUrl: true
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error: any) {
        console.error("POST PROFILE ERROR:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
