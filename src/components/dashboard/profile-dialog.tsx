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
    
    // Crop & Reposition States
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
    const [zoom, setZoom] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    
    const router = useRouter()

    useEffect(() => {
        setAvatarUrl(user.avatarUrl || null)
    }, [user.avatarUrl])

    // Reset crop states when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setSelectedImage(null)
            setImageDimensions(null)
            setZoom(1)
            setPosition({ x: 0, y: 0 })
        }
    }, [isOpen])

    // Clamp coordinates on zoom change to prevent black edges
    useEffect(() => {
        if (!imageDimensions) return

        const imgRatio = imageDimensions.width / imageDimensions.height
        const baseWidth = imgRatio > 1 ? 200 * imgRatio : 200
        const baseHeight = imgRatio > 1 ? 200 : 200 / imgRatio

        const zoomedWidth = baseWidth * zoom
        const zoomedHeight = baseHeight * zoom

        const maxX = Math.max(0, (zoomedWidth - 200) / 2)
        const maxY = Math.max(0, (zoomedHeight - 200) / 2)

        setPosition(prev => ({
            x: Math.max(-maxX, Math.min(maxX, prev.x)),
            y: Math.max(-maxY, Math.min(maxY, prev.y))
        }))
    }, [zoom, imageDimensions])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, selecione uma imagem válida.")
            return
        }

        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            
            const img = new Image()
            img.src = dataUrl
            img.onload = () => {
                setImageDimensions({
                    width: img.width,
                    height: img.height
                })
                setSelectedImage(dataUrl)
                setZoom(1)
                setPosition({ x: 0, y: 0 })
            }
        }
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!selectedImage) return
        setIsDragging(true)
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !imageDimensions) return
        
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y
        
        const imgRatio = imageDimensions.width / imageDimensions.height
        const baseWidth = imgRatio > 1 ? 200 * imgRatio : 200
        const baseHeight = imgRatio > 1 ? 200 : 200 / imgRatio
        
        const zoomedWidth = baseWidth * zoom
        const zoomedHeight = baseHeight * zoom
        
        const maxX = Math.max(0, (zoomedWidth - 200) / 2)
        const maxY = Math.max(0, (zoomedHeight - 200) / 2)
        
        setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY))
        })
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!selectedImage || e.touches.length !== 1) return
        setIsDragging(true)
        const touch = e.touches[0]
        setDragStart({
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        })
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging || !imageDimensions || e.touches.length !== 1) return
        const touch = e.touches[0]
        
        const newX = touch.clientX - dragStart.x
        const newY = touch.clientY - dragStart.y
        
        const imgRatio = imageDimensions.width / imageDimensions.height
        const baseWidth = imgRatio > 1 ? 200 * imgRatio : 200
        const baseHeight = imgRatio > 1 ? 200 : 200 / imgRatio
        
        const zoomedWidth = baseWidth * zoom
        const zoomedHeight = baseHeight * zoom
        
        const maxX = Math.max(0, (zoomedWidth - 200) / 2)
        const maxY = Math.max(0, (zoomedHeight - 200) / 2)
        
        setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY))
        })
    }

    const handleMouseUpOrLeave = () => {
        setIsDragging(false)
    }

    const handleSaveCroppedImage = async () => {
        if (!selectedImage || !imageDimensions) return

        setUploading(true)
        try {
            const img = new Image()
            img.src = selectedImage
            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
            })

            const canvas = document.createElement("canvas")
            canvas.width = 256
            canvas.height = 256
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Could not get canvas context")

            ctx.clearRect(0, 0, 256, 256)

            // Draw image relative to its center, translated by user's drag coordinates
            ctx.translate(128, 128)

            const scaleFactor = 256 / 200
            ctx.translate(position.x * scaleFactor, position.y * scaleFactor)

            const imgRatio = imageDimensions.width / imageDimensions.height
            let drawWidth = 256
            let drawHeight = 256
            if (imgRatio > 1) {
                drawWidth = 256 * imgRatio
            } else {
                drawHeight = 256 / imgRatio
            }

            ctx.scale(zoom, zoom)
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

            const base64Image = canvas.toDataURL("image/jpeg", 0.85)

            const res = await fetch("/api/user/profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    avatarUrl: base64Image
                })
            })

            if (!res.ok) throw new Error()

            const data = await res.json()
            setAvatarUrl(data.avatarUrl)
            toast.success("Foto do perfil atualizada com sucesso!")
            
            if (onSuccess) {
                onSuccess(data.avatarUrl)
            }
            
            setSelectedImage(null)
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error("Save cropped image error:", error)
            toast.error("Erro ao salvar a foto posicionada")
        } finally {
            setUploading(false)
        }
    }

    const imgRatio = imageDimensions ? imageDimensions.width / imageDimensions.height : 1

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl overflow-hidden p-0 bg-white">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100/60 text-left">
                    <DialogTitle className="font-black text-xl text-slate-900 tracking-tight">Editar Perfil</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-0.5">
                        Gerencie sua foto e dados cadastrais
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 flex flex-col items-center justify-center space-y-6">
                    {selectedImage ? (
                        /* Interactive Crop Viewport */
                        <div className="flex flex-col items-center justify-center w-full space-y-6">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Arraste a imagem para reposicionar e use o slider para zoom
                                </p>
                            </div>
                            
                            <div 
                                className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-2 border-indigo-500 shadow-inner bg-slate-50 cursor-grab active:cursor-grabbing select-none touch-none"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUpOrLeave}
                                onMouseLeave={handleMouseUpOrLeave}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleMouseUpOrLeave}
                            >
                                <img 
                                    src={selectedImage} 
                                    alt="Preview" 
                                    className="absolute max-w-none origin-center pointer-events-none"
                                    style={{
                                        width: imgRatio > 1 ? "auto" : "200px",
                                        height: imgRatio > 1 ? "200px" : "auto",
                                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                        left: "50%",
                                        top: "50%",
                                        marginLeft: imgRatio > 1 ? `-${(200 * imgRatio) / 2}px` : "-100px",
                                        marginTop: imgRatio > 1 ? "-100px" : `-${(200 / imgRatio) / 2}px`,
                                    }}
                                />
                            </div>

                            {/* Zoom Slider */}
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Zoom</span>
                                    <span>{Math.round(zoom * 100)}%</span>
                                </div>
                                <input 
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.01"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Avatar Upload Dropzone & Info */
                        <div className="w-full space-y-6">
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
                                            onChange={handleFileChange} 
                                            className="hidden" 
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clique na foto para alterar</p>
                            </div>

                            {/* User Read-only Details */}
                            <div className="space-y-4 w-full">
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
                    )}
                </div>

                {selectedImage ? (
                    /* Crop Mode Footer */
                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-slate-50/50 flex items-center justify-between gap-3 w-full sm:flex-row">
                        <Button 
                            onClick={() => setSelectedImage(null)} 
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-950 font-black uppercase tracking-wider text-[10px] sm:text-xs py-2 px-5 cursor-pointer rounded-xl"
                            disabled={uploading}
                        >
                            Voltar
                        </Button>
                        <Button 
                            onClick={handleSaveCroppedImage} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs py-2 px-5 cursor-pointer rounded-xl flex items-center gap-2"
                            disabled={uploading}
                        >
                            {uploading ? "Salvando..." : "Salvar Foto"}
                        </Button>
                    </DialogFooter>
                ) : (
                    /* Normal Mode Footer */
                    <DialogFooter className="px-5 py-4 border-t border-slate-100/60 bg-slate-50/50 flex items-center justify-end gap-3 w-full">
                        <Button 
                            onClick={() => onOpenChange(false)} 
                            className="bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs py-2 px-5 cursor-pointer rounded-xl"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
