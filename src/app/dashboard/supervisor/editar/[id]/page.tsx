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
        <div className="space-y-6 max-w-lg mx-auto pb-10">
            <div className="flex items-center gap-2">
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <fieldset disabled={isReadOnly} className="space-y-4 group-disabled:opacity-50">
                        {/* DATA */}
                        <FormField
                            control={form.control}
                            name="data"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Data</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    disabled={isReadOnly}
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
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
                                        <PopoverContent className="w-auto p-0" align="start">
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
                                <FormLabel>Posto</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
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
                                <FormLabel>Diarista</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
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
                                <FormLabel>Cobriu Quem?</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
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
                                    <FormLabel>Motivo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {options.motivos.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                            />

                            {/* CARGA */}
                            <FormField control={form.control} name="cargaHorariaId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Carga</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
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
                                    <FormLabel>Valor (R$)</FormLabel>
                                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                </FormItem>
                            )}
                            />
                            <FormField control={form.control} name="meioPagamentoSolicitadoId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pagamento</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {options.meios.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                            />
                        </div>

                        <FormField control={form.control} name="observacao" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Observação</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="..." className="resize-none" {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                        />
                    </fieldset>

                    {!isReadOnly && (
                        <Button type="submit" className="w-full h-12 text-lg" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar e Reenviar
                        </Button>
                    )}
                </form>
            </Form>
        </div>
    )
}
