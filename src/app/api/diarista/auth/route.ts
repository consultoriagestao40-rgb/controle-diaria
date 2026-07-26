import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Autenticação / Identificação Simplificada do Diarista
 * Permite entrar com o CPF (ou Telefone/E-mail) e Senha
 */
export async function POST(req: NextRequest) {
    try {
        const { cpf, senha } = await req.json()

        if (!cpf) {
            return NextResponse.json({ error: "CPF é obrigatório." }, { status: 400 })
        }

        const cleanCpf = cpf.replace(/\D/g, "")

        // Busca o diarista pelo CPF limpo ou formatado
        const diarista = await prisma.diarista.findFirst({
            where: {
                OR: [
                    { cpf: cleanCpf },
                    { cpf: cpf }
                ],
                ativo: true
            }
        })

        if (!diarista) {
            return NextResponse.json({ error: "Diarista não encontrado com este CPF." }, { status: 444 })
        }

        // Se o diarista já tiver senha cadastrada, valida. Se não tiver, permite definir ou faz acesso inicial.
        if (diarista.senha && senha && diarista.senha !== senha) {
            return NextResponse.json({ error: "Senha incorreta." }, { status: 401 })
        }

        // Se não tinha senha cadastrada e enviou uma senha, salva como a senha dele
        if (!diarista.senha && senha) {
            await prisma.diarista.update({
                where: { id: diarista.id },
                data: { senha }
            })
        }

        return NextResponse.json({
            success: true,
            diarista: {
                id: diarista.id,
                nome: diarista.nome,
                cpf: diarista.cpf,
                chavePix: diarista.chavePix,
                telefone: diarista.telefone
            }
        })

    } catch (error: any) {
        console.error("[DIARISTA AUTH ERROR]", error)
        return NextResponse.json({ error: "Erro ao autenticar diarista." }, { status: 500 })
    }
}
