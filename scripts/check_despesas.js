const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("=== DIAGNÓSTICO DE DESPESAS E USUÁRIOS ===")

    // 1. Listar usuários com papéis de Admin, Aprovador, Financeiro
    const users = await prisma.user.findMany({
        where: {
            role: { in: ['ADMIN', 'APROVADOR', 'APROVADOR_N1', 'APROVADOR_N2', 'FINANCEIRO'] }
        },
        select: {
            id: true,
            nome: true,
            email: true,
            role: true,
            centroCusto: { select: { nome: true } }
        }
    })

    console.log("\n--- Usuários de Gestão/Aprovação ---")
    users.forEach(u => {
        console.log(`ID: ${u.id} | Nome: ${u.nome} | Role: ${u.role} | Centro de Custo: ${u.centroCusto?.nome || 'Nenhum'}`)
    })

    // 2. Listar Centros de Custo e seus Aprovadores
    const centros = await prisma.centroCusto.findMany({
        include: {
            aprovadorN1: { select: { nome: true } },
            aprovadorN2: { select: { nome: true } }
        }
    })

    console.log("\n--- Centros de Custo ---")
    centros.forEach(c => {
        console.log(`Centro: ${c.nome} | Aprovador N1: ${c.aprovadorN1?.nome || 'Nenhum'} | Aprovador N2: ${c.aprovadorN2?.nome || 'Nenhum'}`)
    })

    // 3. Listar despesas em status de aprovação
    const despesas = await prisma.despesa.findMany({
        where: {
            status: { in: ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_N1', 'AGUARDANDO_APROVACAO_N2'] }
        },
        include: {
            solicitante: { select: { nome: true } },
            centroCusto: { select: { nome: true, aprovadorN1Id: true, aprovadorN2Id: true } }
        }
    })

    console.log("\n--- Despesas Aguardando Aprovação ---")
    if (despesas.length === 0) {
        console.log("Nenhuma despesa aguardando aprovação no momento.")
    } else {
        despesas.forEach(d => {
            console.log(`ID: ${d.id.slice(0,8)} | Solicitante: ${d.solicitante.nome} | Tipo: ${d.tipo} | Status: ${d.status} | Valor: R$ ${d.valorSolicitado.toString()}`)
            console.log(`   Centro Custo: ${d.centroCusto?.nome || 'Nenhum'}`)
            console.log(`   Aprovador N1 ID do CC: ${d.centroCusto?.aprovadorN1Id || 'Nenhum'}`)
            console.log(`   Aprovador N2 ID do CC: ${d.centroCusto?.aprovadorN2Id || 'Nenhum'}`)
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
