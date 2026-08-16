import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const EMPRESAS_INICIAIS = [
    { nome: "Spot Facilities", cnpj: null },
    { nome: "JVS Facilities", cnpj: null },
    { nome: "JAVS Tratamentos", cnpj: null },
    { nome: "Clean Tech", cnpj: null },
]

async function main() {
    console.log("🌱 Verificando e cadastrando empresas...")

    for (const item of EMPRESAS_INICIAIS) {
        let empresa = await prisma.empresa.findFirst({
            where: { nome: { equals: item.nome, mode: "insensitive" } }
        })

        if (!empresa) {
            empresa = await prisma.empresa.create({
                data: {
                    nome: item.nome,
                    ativo: true
                }
            })
            console.log(`✅ Empresa criada: ${empresa.nome} (${empresa.id})`)
        } else {
            console.log(`ℹ️ Empresa já existe: ${empresa.nome} (${empresa.id})`)
        }

        // Garante que a empresa tenha uma ContaAzulConfig associada
        const config = await prisma.contaAzulConfig.findUnique({
            where: { empresaId: empresa.id }
        })

        if (!config) {
            await prisma.contaAzulConfig.create({
                data: {
                    empresaId: empresa.id,
                    ativo: true,
                    autoCriarAoAprovar: true
                }
            })
            console.log(`   🔗 Configuração do Conta Azul inicializada para ${empresa.nome}`)
        }
    }

    console.log("🎉 Processo de seed das empresas concluído com sucesso!")
}

main()
    .catch((e) => {
        console.error("❌ Erro ao rodar seed de empresas:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
