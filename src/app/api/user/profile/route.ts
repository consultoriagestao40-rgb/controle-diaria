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
        const formData = await req.formData()
        const file = formData.get("file") as File | null
        const name = formData.get("name") as string | null

        let avatarUrl = undefined

        if (file) {
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Ensure public/uploads exists
            const uploadDir = join(process.cwd(), "public", "uploads")
            try {
                await mkdir(uploadDir, { recursive: true })
            } catch {}

            const filename = `avatar-${userId}-${Date.now()}-${file.name.replace(/\s/g, '_')}`
            const filepath = join(uploadDir, filename)

            await writeFile(filepath, buffer)
            avatarUrl = `/uploads/${filename}`
        }

        const updateData: any = {}
        if (name !== null) updateData.nome = name
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

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
