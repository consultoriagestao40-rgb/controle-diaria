import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding Demo Data...')

    // Get Catalogs
    const supervisor = await prisma.user.findFirst({ where: { role: 'SUPERVISOR' } })
    const posto = await prisma.posto.findFirst()
    const diarista = await prisma.diarista.findFirst()
    const reserva = await prisma.reserva.findFirst()
    const motivo = await prisma.motivo.findFirst()
    const carga = await prisma.cargaHoraria.findFirst()
    const meio = await prisma.meioPagamento.findFirst()

    if (!supervisor || !posto || !diarista || !reserva || !motivo || !carga || !meio) {
        console.error('❌ Missing basic catalogs. Run normal seed first.')
        return
    }

    // 1. PENDENTE (For Approver)
    await prisma.cobertura.create({
        data: {
            data: new Date(),
            postoId: posto.id,
            diaristaId: diarista.id,
            reservaId: reserva.id,
            motivoId: motivo.id,
            cargaHorariaId: carga.id,
            valor: 150.00,
            meioPagamentoSolicitadoId: meio.id,
            supervisorId: supervisor.id,
            status: 'PENDENTE',
            observacao: 'Cobertura de emergência (Demo)'
        }
    })

    // 2. APROVADO (For Finance)
    await prisma.cobertura.create({
        data: {
            data: new Date(),
            postoId: posto.id,
            diaristaId: diarista.id,
            reservaId: reserva.id,
            motivoId: motivo.id,
            cargaHorariaId: carga.id,
            valor: 200.00,
            meioPagamentoSolicitadoId: meio.id,
            supervisorId: supervisor.id,
            status: 'APROVADO',
            aprovadorId: supervisor.id, // Using supervisor as approver just for foreign key validtion if seed admin exists
            dataAprovacao: new Date(),
            observacao: 'Aprovado para pagamento (Demo)'
        }
    })

    // 3. AJUSTE (For Supervisor Edit)
    await prisma.cobertura.create({
        data: {
            data: new Date(),
            postoId: posto.id,
            diaristaId: diarista.id,
            reservaId: reserva.id,
            motivoId: motivo.id,
            cargaHorariaId: carga.id,
            valor: 300.00, // Wrong value maybe?
            meioPagamentoSolicitadoId: meio.id,
            supervisorId: supervisor.id,
            status: 'AJUSTE',
            ajusteSolicitado: 'Valor incorreto, favor verificar tabela.',
            observacao: 'Aguardando correção (Demo)'
        }
    })

    // 4. REPROVADO (For ReadOnly View)
    await prisma.cobertura.create({
        data: {
            data: new Date(),
            postoId: posto.id,
            diaristaId: diarista.id,
            reservaId: reserva.id,
            motivoId: motivo.id,
            cargaHorariaId: carga.id,
            valor: 1000.00,
            meioPagamentoSolicitadoId: meio.id,
            supervisorId: supervisor.id,
            status: 'REPROVADO',
            justificativaReprovacao: 'Duplicidade de lançamento.',
            observacao: 'Item reprovado (Demo)'
        }
    })

    console.log('✅ Demo Data Created!')
    console.log('1x Pendente -> Aprovador')
    console.log('1x Aprovado -> Financeiro')
    console.log('1x Ajuste -> Supervisor')
    console.log('1x Reprovado -> Supervisor')
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
