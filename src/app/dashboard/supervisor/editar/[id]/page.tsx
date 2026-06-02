"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Validation Schema
const formSchema = z.object({
    data: z.date(),
    postoId: z.string().min(1),
    diaristaId: z.string().min(1),
    reservaId: z.string().min(1),
    motivoId: z.string().min(1),
    cargaHorariaId: z.string().min(1),
    valor: z.any().transform(v => String(v)),
    meioPagamentoSolicitadoId: z.string().min(1),
    observacao: z.string().optional(),
})

export default async function EditarDiariaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditarDiariaForm id={id} />
}

function EditarDiariaForm({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [options, setOptions] = useState<any>({
        postos: [],
        diaristas: [],
        motivos: [],
        reservas: [],
        cargas: [],
        meios: []
    })
    const [originalData, setOriginalData] = useState<any>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    })

    useEffect(() => {
        Promise.all([fetchOptions(), fetchDiaria()]).then(() => setLoading(false))
    }, [])

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/supervisor/options")
            if (res.ok) setOptions(await res.json())
        } catch { }
    }

    const fetchDiaria = async () => {
        try {
            const res = await fetch(`/api/supervisor/coberturas/${id}`)
            if (!res.ok) throw new Error("Erro ao carregar")
            const data = await res.json()
            setOriginalData(data)

            // Reset form with data
            form.reset({
                data: new Date(data.data),
                postoId: data.postoId,
                diaristaId: data.diaristaId,
                reservaId: data.reservaId,
                motivoId: data.motivoId,
                cargaHorariaId: data.cargaHorariaId,
                valor: data.valor,
                meioPagamentoSolicitadoId: data.meioPagamentoSolicitadoId,
                observacao: data.observacao || ""
            })
        } catch {
            toast.error("Erro ao carregar dados da diária")
        }
    }

    const isReadOnly = originalData && !['PENDENTE', 'AJUSTE'].includes(originalData.status)

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (isReadOnly) return
        try {
            const res = await fetch(`/api/supervisor/coberturas/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) throw new Error()

            toast.success("Diária atualizada e reenviada!")
            router.push("/dashboard/supervisor")
        } catch (error) {
            toast.error("Erro ao salvar")
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-10 px-0 sm:px-0">
            <div className="flex items-center gap-2 px-4 sm:px-0">
                <Link href="/dashboard/supervisor">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">
                        {isReadOnly ? "Detalhes da Diária" : "Editar Diária"}
                    </h1>
                    <p className="text-sm text-muted-foreground mr-2">
                        {isReadOnly ? "Visualização apenas." : "Corrija os dados e reenvie para aprovação."}
                    </p>
                </div>
            </div>

            {originalData?.status === 'AJUSTE' && (
                <Alert variant="destructive" className="bg-orange-50 text-orange-800 border-orange-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Solicitação de Ajuste</AlertTitle>
                    <AlertDescription>
                        {originalData.ajusteSolicitado || "O aprovador solicitou correções neste lançamento."}
                    </AlertDescription>
                </Alert>
            )}

            {originalData?.status === 'REPROVADO' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Reprovado</AlertTitle>
                    <AlertDescription>
                        {originalData.justificativaReprovacao}
                    </AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
 
                    <fieldset disabled={isReadOnly} className="space-y-6 group-disabled:opacity-50">
                        {/* DATA */}
                        <FormField
                            control={form.control}
                            name="data"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Data *</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    disabled={isReadOnly}
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all",
                                                        !field.value && "text-slate-400"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: ptBR })
                                                    ) : (
                                                        <span>Selecione a data</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
 
                        {/* POSTO */}
                        <FormField control={form.control} name="postoId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Posto de Trabalho *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        {options.postos.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
 
                        {/* DIARISTA */}
                        <FormField control={form.control} name="diaristaId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Quem Cobriu? (Diarista) *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        {options.diaristas.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
 
                        {/* RESERVA */}
                        <FormField control={form.control} name="reservaId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Cobriu Quem? (Ausente) *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        {options.reservas.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
 
                        <div className="grid grid-cols-2 gap-4">
                            {/* MOTIVO */}
                            <FormField control={form.control} name="motivoId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Motivo *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {options.motivos.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                            />
 
                            {/* CARGA */}
                            <FormField control={form.control} name="cargaHorariaId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Carga *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {options.cargas.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                            />
                        </div>
 
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="valor" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Valor (R$) *</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                            <Input type="number" step="0.01" inputMode="decimal" {...field} className="w-full h-12 pl-9 bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-black text-slate-900 tracking-tighter" />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                            />
                            <FormField control={form.control} name="meioPagamentoSolicitadoId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Meio Pagamento *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {options.meios.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                            />
                        </div>
 
                        <FormField control={form.control} name="observacao" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold text-slate-500 ml-1">Observação</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Observações adicionais..." className="w-full min-h-[100px] bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 text-sm font-medium text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none shadow-none" {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                        />
                    </fieldset>
 
                    {!isReadOnly && (
                        <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-primary shadow-xl hover:shadow-primary/20 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 cursor-pointer" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Salvando...</span>
                                </div>
                            ) : (
                                <span>Salvar e Reenviar</span>
                            )}
                        </Button>
                    )}
                </form>
            </Form>
        </div>
    )
}
