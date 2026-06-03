import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                })

                if (!user) {
                    return null
                }

                // Simple plain text check for V1 (as per seed)
                // In production, use bcrypt.compare(credentials.password, user.password)
                if (user.password !== credentials.password) {
                    return null
                }

                return {
                    id: user.id,
                    name: user.nome,
                    email: user.email,
                    role: user.role,
                    acessoDespesas: user.acessoDespesas,
                    acessoCoberturas: user.acessoCoberturas,
                    avatarUrl: user.avatarUrl,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
                token.id = user.id
                token.acessoDespesas = (user as any).acessoDespesas
                token.acessoCoberturas = (user as any).acessoCoberturas
                token.avatarUrl = (user as any).avatarUrl
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                (session.user as any).acessoDespesas = token.acessoDespesas;
                (session.user as any).acessoCoberturas = token.acessoCoberturas;
                (session.user as any).avatarUrl = token.avatarUrl;
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
}
