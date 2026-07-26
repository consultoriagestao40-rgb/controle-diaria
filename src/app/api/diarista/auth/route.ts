import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Autenticação Segura do Diarista
 * 1º Acesso: O prestador informa CPF e cadastra sua senha de acesso.
 * Acessos posteriores: Exige obrigatoriamente a senha cadastrada.
 */
export async function POST(req: NextRequest) {
    try {
        const { cpf, senha } = await req.json()

        if (!cpf) {
            return NextResponse.json({ error: "CPF é obrigatório." }, { status: 400 })
        }

        const cleanCpf = cpf.replace(/\D/g, "")

        // Busca o diarista pelo CPF
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
            return NextResponse.json({ error: "Diarista não encontrado com este CPF. Verifique se seu cadastro foi aprovado pelo supervisor." }, { status: 404 })
        }

        // Se o diarista NÃO possui senha cadastrada (Primeiro Acesso)
        if (!diarista.senha) {
            if (!senha || senha.length < 4) {
                return NextResponse.json({
                    primeiroAcesso: true,
                    error: "Este é seu 1º acesso! Crie uma senha de segurança (mínimo 4 dígitos) para proteger sua conta."
                }, { status: 202 })
            }

            // Cadastra a nova senha do diarista
            await prisma.diarista.update({
                where: { id: diarista.id },
                data: { senha }
            })

            return NextResponse.json({
                success: true,
                message: "Senha cadastrada com sucesso!",
                diarista: {
                    id: diarista.id,
                    nome: diarista.nome,
                    cpf: diarista.cpf,
                    chavePix: diarista.chavePix,
                    telefone: diarista.telefone
                }
            })
        }

        // Se JÁ possui senha cadastrada, a verificação de senha é OBRIGATÓRIA
        if (!senha) {
            return NextResponse.json({ error: "Senha de acesso é obrigatória." }, { status: 401 })
        }

        if (diarista.senha !== senha) {
            return NextResponse.json({ error: "Senha incorreta. Tente novamente." }, { status: 401 })
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
