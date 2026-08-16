import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🧹 Iniciando limpeza das empresas duplicadas...")

    const duplicateIds = [
        "54fd506c-0dd5-44df-b1ba-e541b3ba8513", // "Spot Facilities" (0 records)
        "658a223c-6c85-4d6f-83d6-f73dae7579e3", // "JVS Facilities" (0 records)
        "69010f52-666d-4847-a2f7-7615812c5302", // "JAVS Tratamentos" (0 records)
    ]

    for (const id of duplicateIds) {
        // Primeiro remove a config associada se houver
        await prisma.contaAzulConfig.deleteMany({
            where: { empresaId: id }
        })
        // Remove a empresa duplicada
        await prisma.empresa.delete({
            where: { id }
        })
        console.log(`🗑️ Removida empresa duplicada ID: ${id}`)
    }

    const restantes = await prisma.empresa.findMany({
        orderBy: { nome: "asc" }
    })

    console.log(`\n✅ Empresas oficiais mantidas (${restantes.length}):`)
    restantes.forEach(e => console.log(` - ${e.nome} (${e.id})`))
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect()
    })
