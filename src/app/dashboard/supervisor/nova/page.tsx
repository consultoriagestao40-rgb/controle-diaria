"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Save, ArrowLeft, Check, ChevronsUpDown } from "lucide-react"

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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command"
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

// Validation Schema
const formSchema = z.object({
    data: z.date(),
    postoId: z.string().min(1, "Posto é obrigatório."),
    diaristaId: z.string().min(1, "Diarista é obrigatória."),
    reservaId: z.string().min(1, "Colaborador é obrigatório."),
    motivoId: z.string().min(1, "Motivo é obrigatório."),
    cargaHorariaId: z.string().min(1, "Carga horária é obrigatória."),
    valor: z.string().min(1, "Valor é obrigatório."),
    meioPagamentoSolicitadoId: z.string().min(1, "Meio de pagamento é obrigatório."),
    observacao: z.string().optional(),
})

export default function NovaDiariaPage() {
    const router = useRouter()
    const [loadingOptions, setLoadingOptions] = useState(true)
    const [options, setOptions] = useState<any>({
        postos: [],
        diaristas: [],
        motivos: [],
        reservas: [],
        cargas: [],
        meios: []
    })

    const [openPosto, setOpenPosto] = useState(false)
    const [openDiarista, setOpenDiarista] = useState(false)
    const [openReserva, setOpenReserva] = useState(false)
    const [openDate, setOpenDate] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            valor: "0",
        },
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/supervisor/options")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setOptions(data)
        } catch {
            toast.error("Erro ao carregar opções")
        } finally {
            setLoadingOptions(false)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const res = await fetch("/api/supervisor/lancamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const text = await res.text()
                let errMsg = "Erro desconhecido"
                try {
                    const json = JSON.parse(text)
                    errMsg = json.error || text
                } catch {
                    errMsg = text || `Erro HTTP ${res.status}`
                }
                alert(`FALHA AO SALVAR: ${errMsg}`) // Force user visibility
                throw new Error(errMsg)
            }

            toast.success("Diária lançada com sucesso!")
            router.push("/dashboard/supervisor")
        } catch (error: any) {
            console.log(error)
            toast.error(error.message || "Erro ao enviar lançamento")
        }
    }

    if (loadingOptions) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-10">
            <div className="flex items-center gap-2">
                <Link href="/dashboard/supervisor">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Nova Diária</h1>
                    <p className="text-sm text-muted-foreground">Preencha os dados do plantão</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.log("Validation Errors:", errors)
                    toast.error("Verifique os campos obrigatórios (vermelho).")
                })} className="space-y-4">

                    {/* DATA */}
                    <FormField
                        control={form.control}
                        name="data"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data do Plantão</FormLabel>
                                <Popover open={openDate} onOpenChange={setOpenDate}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
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
                                            onSelect={(e) => {
                                                field.onChange(e)
                                                setOpenDate(false)
                                            }}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* POSTO COMBOBOX */}
                    <FormField
                        control={form.control}
                        name="postoId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Posto de Trabalho</FormLabel>
                                <Popover open={openPosto} onOpenChange={setOpenPosto}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? options.postos.find(
                                                        (item: any) => item.id === field.value
                                                    )?.nome
                                                    : "Selecione o posto"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar posto..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum posto encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {options.postos.map((item: any) => (
                                                        <CommandItem
                                                            value={item.nome}
                                                            key={item.id}
                                                            onSelect={() => {
                                                                form.setValue("postoId", item.id)
                                                                setOpenPosto(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    item.id === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {item.nome}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* DIARISTA COMBOBOX */}
                    <FormField
                        control={form.control}
                        name="diaristaId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Diarista (Executante)</FormLabel>
                                <Popover open={openDiarista} onOpenChange={setOpenDiarista}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? options.diaristas.find(
                                                        (item: any) => item.id === field.value
                                                    )?.nome
                                                    : "Quem cobriu?"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar diarista..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhuma diarista encontrada.</CommandEmpty>
                                                <CommandGroup>
                                                    {options.diaristas.map((item: any) => (
                                                        <CommandItem
                                                            value={item.nome}
                                                            key={item.id}
                                                            onSelect={() => {
                                                                form.setValue("diaristaId", item.id)
                                                                setOpenDiarista(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    item.id === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {item.nome}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* COLABORADOR (RESERVA) COMBOBOX */}
                    <FormField
                        control={form.control}
                        name="reservaId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Colaborador (Quem Faltou)</FormLabel>
                                <Popover open={openReserva} onOpenChange={setOpenReserva}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? options.reservas.find(
                                                        (item: any) => item.id === field.value
                                                    )?.nome
                                                    : "Quem faltou?"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar colaborador..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {options.reservas.map((item: any) => (
                                                        <CommandItem
                                                            value={item.nome}
                                                            key={item.id}
                                                            onSelect={() => {
                                                                form.setValue("reservaId", item.id)
                                                                setOpenReserva(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    item.id === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {item.nome}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        {/* MOTIVO */}
                        <FormField
                            control={form.control}
                            name="motivoId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {options.motivos.map((i: any) => (
                                                <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* CARGA HORARIA */}
                        <FormField
                            control={form.control}
                            name="cargaHorariaId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Carga</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Hrs" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {options.cargas.map((i: any) => (
                                                <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* VALOR */}
                        <FormField
                            control={form.control}
                            name="valor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor (R$)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* MEIO PAGAMENTO */}
                        <FormField
                            control={form.control}
                            name="meioPagamentoSolicitadoId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pagamento</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {options.meios.map((i: any) => (
                                                <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* OBSERVACAO */}
                    <FormField
                        control={form.control}
                        name="observacao"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Observação</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Detalhes adicionais..."
                                        className="resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full h-12 text-lg" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lançar Diária
                    </Button>
                </form>
            </Form>
        </div>
    )
}
