import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- DEBUG STATS SCRIPT (SIMPLE) ---")

    // Hardcoded range based on what we think corresponds to the screenshot
    const start = new Date("2026-01-01T00:00:00.000Z")
    const end = new Date("2026-01-08T23:59:59.999Z")

    console.log(`Range: ${start.toISOString()} TO ${end.toISOString()}`)

    const where = {
        data: {
            gte: start,
            lte: end
        },
        status: { in: ['PAGO', 'APROVADO'] as any } // Cast to avoid enum import
    }

    console.log("Querying with:", JSON.stringify(where, null, 2))

    // 1. Check Raw Count
    const count = await prisma.cobertura.count({ where })
    console.log(`Matched Count: ${count}`)

    // 2. Dump Items
    const items = await prisma.cobertura.findMany({
        where,
        select: { id: true, status: true, data: true, valor: true }
    })
    console.log("Matched Items:", items)

    // 3. Debug Dates of ALL items
    if (count === 0) {
        console.log("--- No match. Dumping ALL items to check dates ---")
        const all = await prisma.cobertura.findMany({ select: { id: true, data: true, status: true } })
        all.forEach(x => {
            console.log(`Item ${x.id}: ${x.status} @ ${x.data.toISOString()}`)
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
