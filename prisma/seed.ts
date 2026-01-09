import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // 1. Catalogs
    const postos = await Promise.all([
        prisma.posto.create({ data: { nome: 'Posto Alpha' } }),
        prisma.posto.create({ data: { nome: 'Posto Beta' } }),
    ])

    const diaristas = await Promise.all([
        prisma.diarista.create({ data: { nome: 'João Silva', cpf: '111.111.111-11' } }),
        prisma.diarista.create({ data: { nome: 'Maria Santos', cpf: '222.222.222-22' } }),
        prisma.diarista.create({ data: { nome: 'Carlos Oliveira', cpf: '333.333.333-33' } }),
    ])

    const reservas = await Promise.all([
        prisma.reserva.create({ data: { nome: 'Reserva 1 (Ausência)', cpf: '444.444.444-44' } }),
        prisma.reserva.create({ data: { nome: 'Reserva 2 (Férias)', cpf: '555.555.555-55' } }),
        prisma.reserva.create({ data: { nome: 'Cristiano M Silva', cpf: '123.456.789-00' } }) // Adding user name as a reserva for testing
    ])

    const motifs = await Promise.all([
        prisma.motivo.create({ data: { descricao: 'Falta Justificada' } }),
        prisma.motivo.create({ data: { descricao: 'Falta Injustificada' } }),
        prisma.motivo.create({ data: { descricao: 'Atestado Médico' } }),
    ])

    const cargas = await Promise.all([
        prisma.cargaHoraria.create({ data: { descricao: '06:00' } }),
        prisma.cargaHoraria.create({ data: { descricao: '08:00' } }),
        prisma.cargaHoraria.create({ data: { descricao: '12:36' } }),
    ])

    const pagamentos = await Promise.all([
        prisma.meioPagamento.create({ data: { descricao: 'PIX' } }),
        prisma.meioPagamento.create({ data: { descricao: 'Transferência' } }),
        prisma.meioPagamento.create({ data: { descricao: 'Dinheiro' } }),
    ])

    // 2. Users (Passwords are plain text '123456' for V1 demo as per minimal auth plan, or hash if using real auth later. Storing plain for simplicity now? 
    // Requirement said "autenticação + RBAC". I'll use simple string comparison or minimal hashing if I add a library. 
    // For 'next-auth' credentials provider, I usually just mock a check. I'll store plain text for the seed to match the 'simple auth' plan.)

    // Admin
    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            nome: 'Administrador',
            email: 'admin@example.com',
            password: 'admin',
            role: Role.ADMIN,
        },
    })

    // Supervisor
    await prisma.user.upsert({
        where: { email: 'supervisor@example.com' },
        update: {},
        create: {
            nome: 'Supervisor José',
            email: 'supervisor@example.com',
            password: 'sup',
            role: Role.SUPERVISOR,
        },
    })

    // Aprovador
    await prisma.user.upsert({
        where: { email: 'aprovador@example.com' },
        update: {},
        create: {
            nome: 'Gerente Aprovador',
            email: 'aprovador@example.com',
            password: 'apr',
            role: Role.APROVADOR,
        },
    })

    // Financeiro
    await prisma.user.upsert({
        where: { email: 'financeiro@example.com' },
        update: {},
        create: {
            nome: 'Analista Financeiro',
            email: 'financeiro@example.com',
            password: 'fin',
            role: Role.FINANCEIRO,
        },
    })

    console.log('Seeding finished.')
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
