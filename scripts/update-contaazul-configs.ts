import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const CLIENT_ID = "3kdledgvpcq8n3bks90cpm07oq"
const CLIENT_SECRET = "s1gae15ub8tpqj7r2gj4d7ucso1d3ns6t08clbivbqp4a77de5p"
const REDIRECT_URI = "https://controle-diaria-6tk9.vercel.app/api/contaazul/callback"

async function main() {
    console.log("🚀 Atualizando credenciais do Conta Azul no banco de dados (Neon)...")

    const empresas = await prisma.empresa.findMany()
    console.log(`Encontradas ${empresas.length} empresas.`)

    for (const empresa of empresas) {
        const updated = await prisma.contaAzulConfig.upsert({
            where: { empresaId: empresa.id },
            update: {
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: REDIRECT_URI,
                ativo: true,
                autoCriarAoAprovar: true
            },
            create: {
                empresaId: empresa.id,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                redirectUri: REDIRECT_URI,
                ativo: true,
                autoCriarAoAprovar: true
            }
        })
        console.log(`✅ Credenciais salvas no banco para: ${empresa.nome}`)
    }

    console.log("🎉 Todas as 4 empresas foram configuradas no banco de dados com sucesso!")
}

main()
    .catch((e) => {
        console.error("❌ Erro:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
