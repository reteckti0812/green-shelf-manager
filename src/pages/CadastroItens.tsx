import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, Clock, Edit2, PauseCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDuration } from "@/lib/format";
import { logAudit } from "@/lib/audit";

interface Lote {
  id: string;
  nome: string;
  b2b: boolean;
  observacao: string | null;
  status: string;
  iniciado_em: string;
  pausado_em: string | null;
  pausa_acumulada_seg: number;
  retomado_em: string | null;
}
interface Item {
  id: string;
  produto_id: string;
  defeito_id: string | null;
  observacao: string | null;
  ordem: number;
  created_at: string;
  produtos: { nome: string; marca: string | null } | null;
  defeitos: { nome: string } | null;
  criado_por: string;
}
interface Produto { id: string; nome: string; marca: string | null }
interface Defeito { id: string; nome: string }

export default function CadastroItens() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const online = useOnlineStatus();

  const [lote, setLote] = useState<Lote | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [defeitoId, setDefeitoId] = useState("");
  const [obsItem, setObsItem] = useState("");
  const [tempo, setTempo] = useState(0);
  const [confirmPausa, setConfirmPausa] = useState(false);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  // load
  const loadItens = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("itens_lote")
      .select("*, produtos(nome,marca), defeitos(nome)")
      .eq("lote_id", id)
      .order("ordem", { ascending: true });
    setItens((data as Item[]) ?? []);
  };

  const loadAll = async () => {
    if (!id) return;
    const [loteRes, prodRes, defRes] = await Promise.all([
      supabase.from("lotes").select("*").eq("id", id).maybeSingle(),
      supabase.from("produtos").select("id,nome,marca").order("nome"),
      supabase.from("defeitos").select("id,nome").order("nome"),
    ]);
    setLote(loteRes.data as Lote | null);
    setProdutos((prodRes.data as Produto[]) ?? []);
    setDefeitos((defRes.data as Defeito[]) ?? []);
    await loadItens();
  };

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel(`lote-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_lote", filter: `lote_id=eq.${id}` }, () => {
        loadItens();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lotes", filter: `id=eq.${id}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          toast.error("Este lote foi excluído por um administrador.");
          navigate("/", { replace: true });
          return;
        }
        if (payload.new) setLote(payload.new as Lote);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // timer (sempre crescente desde o início do lote, descontando pausa acumulada)
  useEffect(() => {
    if (!lote) return;
    const update = () => {
      const inicio = new Date(lote.iniciado_em).getTime();
      const agora = Date.now();
      const pausaAtual = lote.status === "pausado" && lote.pausado_em
        ? Math.floor((agora - new Date(lote.pausado_em).getTime()) / 1000)
        : 0;
      const decorrido = Math.max(
        0,
        Math.floor((agora - inicio) / 1000) - (lote.pausa_acumulada_seg ?? 0) - pausaAtual
      );
      setTempo(decorrido);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [lote]);

  // auto pausa offline
  useEffect(() => {
    if (!online && lote?.status === "em_andamento") {
      pausarLote(true);
    }
  }, [online]);

  const ultimoItem = useMemo(() => itens[itens.length - 1], [itens]);
  const recentes = useMemo(() => itens.slice(-5).reverse(), [itens]);

  const adicionarItem = async () => {
    if (!online) return toast.error("Sem conexão.");
    if (!produtoId) return toast.error("Selecione um produto.");
    if (!user || !id) return;

    const novaOrdem = (itens[itens.length - 1]?.ordem ?? 0) + 1;
    const { data, error } = await supabase
      .from("itens_lote")
      .insert({
        lote_id: id,
        produto_id: produtoId,
        defeito_id: defeitoId || null,
        observacao: obsItem.trim() || null,
        ordem: novaOrdem,
        criado_por: user.id,
      })
      .select("*, produtos(nome,marca), defeitos(nome)")
      .single();
    if (error) return toast.error("Erro ao adicionar", { description: error.message });

    // Atualização instantânea (otimista) — o realtime confirma depois
    if (data) {
      setItens((prev) => {
        if (prev.some((i) => i.id === data.id)) return prev;
        return [...prev, data as Item];
      });
    }

    await logAudit({
      acao: "adicionar_item",
      entidade: "itens_lote",
      entidade_id: data?.id,
      descricao: `Item adicionado ao lote ${lote?.nome}`,
      valor_novo: data,
    });
    setProdutoId("");
    setDefeitoId("");
    setObsItem("");
    toast.success("Item adicionado");
  };

  const editarItem = async () => {
    if (!editing || !online) return;
    const { error } = await supabase
      .from("itens_lote")
      .update({
        produto_id: editing.produto_id,
        defeito_id: editing.defeito_id,
        observacao: editing.observacao,
      })
      .eq("id", editing.id);
    if (error) return toast.error("Erro ao editar", { description: error.message });
    await logAudit({
      acao: "editar_item",
      entidade: "itens_lote",
      entidade_id: editing.id,
      descricao: "Item editado",
      valor_novo: editing,
    });
    setEditing(null);
    toast.success("Item atualizado");
  };

  const excluirItem = async () => {
    if (!deleting || !online || !id) return;

    // Revalida no banco que ESTE item ainda é literalmente o último (maior ordem)
    const { data: ultimoNoBanco } = await supabase
      .from("itens_lote")
      .select("id, ordem")
      .eq("lote_id", id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ultimoNoBanco || ultimoNoBanco.id !== deleting.id) {
      toast.error("Apenas o último item lançado pode ser excluído.");
      setDeleting(null);
      await loadItens();
      return;
    }

    const { error } = await supabase.from("itens_lote").delete().eq("id", deleting.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });

    // Remove localmente de imediato (sem promover o anterior a "último editável")
    setItens((prev) => prev.filter((i) => i.id !== deleting.id));

    await logAudit({
      acao: "excluir_item",
      entidade: "itens_lote",
      entidade_id: deleting.id,
      descricao: "Último item excluído",
      valor_anterior: deleting,
    });
    setDeleting(null);
    toast.success("Item excluído");
  };

  const pausarLote = async (auto = false) => {
    if (!lote) return;
    // Se vinha de uma retomada, acumula o tempo decorrido desde o último retomado_em (ou início)
    // Como já consideramos pausa_acumulada_seg, aqui apenas marcamos pausado_em e status.
    const { data, error } = await supabase
      .from("lotes")
      .update({
        status: "pausado",
        pausado_em: new Date().toISOString(),
      })
      .eq("id", lote.id)
      .select()
      .single();
    if (error) return toast.error("Erro ao pausar", { description: error.message });
    await logAudit({
      acao: auto ? "pausar_lote_auto_offline" : "pausar_lote",
      entidade: "lotes",
      entidade_id: lote.id,
      descricao: auto ? "Pausa automática por queda de conexão" : "Lote pausado manualmente",
      valor_novo: data,
    });
    toast.success(auto ? "Lote pausado (offline)" : "Lote pausado");
    setConfirmPausa(false);
    if (!auto) navigate("/lotes-pausados");
  };

  const finalizar = async () => {
    if (!lote) return;
    if (itens.length === 0) {
      toast.error("Adicione ao menos um item antes de finalizar.");
      return;
    }
    setConfirmFinalizar(false);
    navigate(`/finalizar/${lote.id}`);
  };

  if (!lote) return <div className="text-muted-foreground">Carregando lote...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* header lote */}
      <div className="corp-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{lote.nome}</h2>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  lote.b2b ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {lote.b2b ? "B2B" : "Não B2B"}
              </span>
            </div>
            {lote.observacao && (
              <p className="text-sm text-muted-foreground">{lote.observacao}</p>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="corp-label">Itens</div>
              <div className="text-2xl font-bold text-primary">{itens.length}</div>
            </div>
            <div className="text-center">
              <div className="corp-label flex items-center gap-1 justify-center">
                <Clock className="h-3 w-3" /> Tempo
              </div>
              <div className="text-2xl font-bold tabular-nums">{formatDuration(tempo)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <span><strong>Atenção:</strong> retire as etiquetas dos produtos antes de cadastrar.</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* cadastro */}
        <div className="lg:col-span-2 corp-card p-5 space-y-4">
          <h3 className="corp-section-title">Cadastrar item</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={produtoId} onValueChange={setProdutoId} disabled={!online}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}{p.marca ? ` — ${p.marca}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Defeito</Label>
              <Select value={defeitoId} onValueChange={setDefeitoId} disabled={!online}>
                <SelectTrigger><SelectValue placeholder="Selecione o defeito" /></SelectTrigger>
                <SelectContent>
                  {defeitos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input value={obsItem} onChange={(e) => setObsItem(e.target.value)} disabled={!online} />
          </div>
          <Button onClick={adicionarItem} disabled={!online} className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" /> Adicionar produto
          </Button>

          <div className="border-t pt-4 flex gap-3">
            <Button variant="outline" onClick={() => setConfirmPausa(true)} className="flex-1" disabled={!online}>
              <PauseCircle className="h-4 w-4 mr-2" /> Pausar lote
            </Button>
            <Button onClick={() => setConfirmFinalizar(true)} className="flex-1" disabled={!online}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar lote
            </Button>
          </div>
        </div>

        {/* histórico */}
        <Card className="p-5">
          <h3 className="corp-section-title mb-3">Últimos 5 itens</h3>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentes.map((item, idx) => {
                const isUltimo = item.id === ultimoItem?.id;
                return (
                  <li
                    key={item.id}
                    className={`p-3 rounded-md border text-sm ${
                      isUltimo ? "border-primary bg-primary-soft" : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">#{item.ordem}</span>
                          <span className="font-medium truncate">{item.produtos?.nome ?? "—"}</span>
                        </div>
                        {item.defeitos && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Defeito: {item.defeitos.nome}
                          </div>
                        )}
                        {item.observacao && (
                          <div className="text-xs text-muted-foreground italic mt-0.5">"{item.observacao}"</div>
                        )}
                      </div>
                      {isUltimo && online && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(item)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleting(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {itens.length > 5 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              +{itens.length - 5} itens anteriores
            </p>
          )}
        </Card>
      </div>

      {/* dialogs */}
      <AlertDialog open={confirmPausa} onOpenChange={setConfirmPausa}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              O lote será movido para "Lotes pausados" e novas ações serão bloqueadas até a retomada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pausarLote(false)}>Pausar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmFinalizar} onOpenChange={setConfirmFinalizar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será levado para o mapa do estoque para escolher a localização do pallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finalizar}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir último item?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirItem} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <AlertDialog open onOpenChange={(v) => !v && setEditing(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Editar item #{editing.ordem}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Produto</Label>
                <Select value={editing.produto_id} onValueChange={(v) => setEditing({ ...editing, produto_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Defeito</Label>
                <Select value={editing.defeito_id ?? ""} onValueChange={(v) => setEditing({ ...editing, defeito_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {defeitos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Observação</Label>
                <Input value={editing.observacao ?? ""} onChange={(e) => setEditing({ ...editing, observacao: e.target.value })} />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={editarItem}>Salvar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
