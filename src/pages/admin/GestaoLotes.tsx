import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListChecks, Trash2, Search } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Link } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";

type StatusKey = "todos" | "em_andamento" | "pausado" | "finalizado" | "sem_localizacao" | "expedido";

const STATUS_CONFIG: Record<Exclude<StatusKey, "todos">, { label: string; cls: string }> = {
  em_andamento: { label: "Em andamento", cls: "bg-success text-success-foreground" },
  pausado: { label: "Pausado", cls: "bg-warning text-warning-foreground" },
  finalizado: { label: "Finalizado", cls: "bg-primary text-primary-foreground" },
  sem_localizacao: { label: "Sem localização", cls: "bg-info text-info-foreground" },
  expedido: { label: "Expedido", cls: "bg-muted text-muted-foreground" },
};

const FILTROS: { key: StatusKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "em_andamento", label: "Em andamento" },
  { key: "pausado", label: "Pausados" },
  { key: "sem_localizacao", label: "Sem localização" },
  { key: "finalizado", label: "Finalizados" },
  { key: "expedido", label: "Expedidos" },
];

export default function GestaoLotes() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<StatusKey>("todos");
  const [busca, setBusca] = useState("");
  const [deleting, setDeleting] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("lotes")
      .select("*, itens_lote(count)")
      .order("iniciado_em", { ascending: false });
    setLotes(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("gestao-lotes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lotes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_lote" }, () => load())
      .subscribe();
    const interval = setInterval(load, 10000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
  }, []);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { todos: lotes.length };
    for (const l of lotes) acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, [lotes]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lotes.filter((l) => {
      if (filtro !== "todos" && l.status !== filtro) return false;
      if (q && !`${l.nome} ${l.operador_nome ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lotes, filtro, busca]);

  const excluirLote = async () => {
    if (!deleting) return;
    const lote = deleting;
    setDeleting(null);
    try {
      await supabase.from("itens_lote").delete().eq("lote_id", lote.id);
      await supabase.from("movimentacoes").delete().eq("lote_id", lote.id);
      const { error } = await supabase.from("lotes").delete().eq("id", lote.id);
      if (error) throw error;
      await logAudit({
        acao: "excluir_lote",
        entidade: "lotes",
        entidade_id: lote.id,
        descricao: `Lote "${lote.nome}" excluído`,
        valor_anterior: lote,
      });
      toast.success("Lote excluído");
      load();
    } catch (e: any) {
      toast.error("Erro ao excluir", { description: e?.message });
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Gestão de lotes</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe, filtre e gerencie todos os lotes em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
          Atualização automática
        </div>
      </div>

      <Card className="p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou operador…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <Button
              key={f.key}
              variant={filtro === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltro(f.key)}
              className="h-8"
            >
              {f.label}
              <span className={cn(
                "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded",
                filtro === f.key ? "bg-primary-foreground/20" : "bg-muted",
              )}>
                {counts[f.key] ?? 0}
              </span>
            </Button>
          ))}
        </div>
      </Card>

      {visiveis.length === 0 ? (
        <Card className="p-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum lote encontrado para os filtros selecionados.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visiveis.map((l) => {
            const cfg = STATUS_CONFIG[l.status as keyof typeof STATUS_CONFIG];
            return (
              <Card key={l.id} className="p-4 hover:border-primary transition-colors h-full flex flex-col">
                <Link to={`/lote/${l.id}`} className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate">{l.nome}</h3>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded shrink-0", cfg?.cls)}>
                      {cfg?.label ?? l.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Operador: <span className="text-foreground font-medium">{l.operador_nome ?? "—"}</span></div>
                    <div>Itens: <span className="text-foreground font-medium">{l.itens_lote?.[0]?.count ?? 0}</span></div>
                    <div>Início: {formatDateTime(l.iniciado_em)}</div>
                    {l.finalizado_em && <div>Finalizado: {formatDateTime(l.finalizado_em)}</div>}
                    <div>Tipo: {l.b2b ? "B2B" : "Não B2B"}</div>
                  </div>
                </Link>
                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-8"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleting(l); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lote "{deleting?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente</strong> e removerá o lote, todos os itens cadastrados nele e seu
              histórico de movimentações. Se houver um operador trabalhando neste lote, ele será redirecionado
              para a tela inicial automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirLote} className="bg-destructive text-destructive-foreground">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
