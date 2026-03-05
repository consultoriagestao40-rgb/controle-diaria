"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        if (res?.error) {
            setError("Credenciais inválidas. Tente novamente.")
            setLoading(false)
        } else {
            router.push("/dashboard") // Will define redirect logic based on role later
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-sidebar p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            <Card className="w-full max-w-md glass-card border-none shadow-2xl relative z-10 p-4">
                <CardHeader className="space-y-4 pb-8">
                    <div className="flex justify-center mb-2">
                        <img
                            src="https://grupojvsserv.com.br/wp-content/uploads/2023/11/logo-horizontal-300px.png"
                            alt="Grupo JVS"
                            className="h-14 w-auto object-contain brightness-0 invert md:brightness-100 md:invert-0"
                        />
                    </div>
                    <div className="space-y-1 text-center">
                        <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Acesso Restrito</CardTitle>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            Gestão de Diárias & Coberturas
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">E-mail Corporativo</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nome@grupojvsserv.com.br"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" name="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Senha de Acesso</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                        <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-primary shadow-lg hover:shadow-primary/20 transition-all duration-300 rounded-xl font-bold uppercase tracking-widest text-[11px]" disabled={loading}>
                            {loading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</div> : "Entrar no Sistema"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-4">
                    &copy; 2026 Grupo JVS &bull; Versão 2.5
                </CardFooter>
            </Card>
        </div>
    )
}
