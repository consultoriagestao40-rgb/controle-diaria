import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return new NextResponse(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { "Content-Type": "application/json" } })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure public/uploads exists
        const uploadDir = join(process.cwd(), "public", "uploads")
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch {}

        const filename = `doc-${Date.now()}-${file.name.replace(/\s/g, '_')}`
        const filepath = join(uploadDir, filename)

        await writeFile(filepath, buffer)
        
        return NextResponse.json({
            url: `/uploads/${filename}`,
            nomeOriginal: file.name,
            tamanho: file.size,
            tipo: file.type
        })
    } catch (error: any) {
        console.error("POST UPLOAD ERROR:", error)
        return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }
}
