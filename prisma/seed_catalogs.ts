import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // ... (previous user seeding logic) ...
    // Not deleting users to preserve manual work, but ensuring catalogs exist

    // 1. Cargas Horarias
    const cargas = ["06:00", "08:00", "09:00", "12:00"]
    for (const c of cargas) {
        const exists = await prisma.cargaHoraria.findFirst({ where: { descricao: c } })
        if (!exists) await prisma.cargaHoraria.create({ data: { descricao: c } })
    }

    // 2. Meios Pagamento
    const meios = ["PIX", "Dinheiro", "Transferência", "Cheque"]
    for (const m of meios) {
        const exists = await prisma.meioPagamento.findFirst({ where: { descricao: m } })
        if (!exists) await prisma.meioPagamento.create({ data: { descricao: m } })
    }

    // 3. Reservas (ensure at least "Banco de Reservas" exists if no specific person)
    const reservaPadrao = await prisma.reserva.findFirst({ where: { nome: "Banco de Reservas" } })
    if (!reservaPadrao) {
        await prisma.reserva.create({ data: { nome: "Banco de Reservas" } })
    }

    console.log('Seed catalogs updated!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
