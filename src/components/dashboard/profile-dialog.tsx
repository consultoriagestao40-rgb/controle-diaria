"use client"

import { useState, useEffect } from "react"
import { Camera, User as UserIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProfileDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    user: { name?: string | null; role?: string; avatarUrl?: string | null }
    onSuccess?: (newAvatarUrl: string) => void
}

export function ProfileDialog({ isOpen, onOpenChange, user, onSuccess }: ProfileDialogProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null)
    const [uploading, setUploading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setAvatarUrl(user.avatarUrl || null)
    }, [user.avatarUrl])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Basic validation: image files only, max 5MB
        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, selecione uma imagem válida.")
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.")
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/user/profile", {
                method: "POST",
                body: formData
            })

            if (!res.ok) throw new Error()

            const data = await res.json()
            setAvatarUrl(data.avatarUrl)
            toast.success("Foto do perfil atualizada com sucesso!")
            
            if (onSuccess) {
                onSuccess(data.avatarUrl)
            }
            
            router.refresh()
        } catch {
            toast.error("Erro ao fazer upload da imagem")
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl overflow-hidden p-0 bg-white">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 text-left">
                    <DialogTitle className="font-black text-xl text-slate-900 tracking-tight">Editar Perfil</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">
                        Gerencie sua foto e dados cadastrais
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Avatar Upload Dropzone */}
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="relative group/upload h-24 w-24 rounded-full border-2 border-slate-200 overflow-hidden shadow-md flex items-center justify-center bg-slate-50">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-10 w-10 text-slate-300" />
                            )}
                            
                            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover/upload:opacity-100 transition-opacity">
                                <Camera className="h-5 w-5 text-white" />
                                <span className="text-[8px] text-white font-black uppercase tracking-wider mt-1">Alterar</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload} 
                                    className="hidden" 
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        
                        {uploading ? (
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest animate-pulse">Enviando imagem...</p>
                        ) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clique na foto para alterar</p>
                        )}
                    </div>

                    {/* User Read-only Details */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Usuário</Label>
                            <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-sm font-semibold text-slate-700">
                                {user.name}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</Label>
                            <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-sm font-semibold text-slate-700 uppercase tracking-wider">
                                {user.role}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-slate-50/50 flex items-center justify-end gap-3 w-full">
                    <Button 
                        onClick={() => onOpenChange(false)} 
                        className="bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs py-2 px-5 cursor-pointer rounded-xl"
                    >
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
