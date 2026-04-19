import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapaEstoque, Localizacao } from "@/components/mapa/MapaEstoque";
import { ArrowRightLeft, LogOut, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";

export default function MapaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reload, setReload] = useState(0);
  const [openLoteId, setOpenLoteId] = useState<string | null>(null);
  const [loteDetalhe, setLoteDetalhe] = useState<any>(null);
  const [actionMenu, setActionMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reabrir" | "saida" | null>(null);
  const [transferindo, setTransferindo] = useState(false);
  const [novaLoc, setNovaLoc] = useState<Localizacao | null>(null);

  useEffect(() => {
    if (!openLoteId) {
      setLoteDetalhe(null);
      return;
    }
    supabase
      .from("lotes")
      .select("*, localizacoes(codigo), itens_lote(*, produtos(nome), defeitos(nome)), movimentacoes(*, localizacao_origem:localizacoes!localizacao_origem_id(codigo), localizacao_destino:localizacoes!localizacao_destino_id(codigo))")
      .eq("id", openLoteId)
      .maybeSingle()
      .then(({ data }) => setLoteDetalhe(data));
  }, [openLoteId, reload]);

  const reabrir = async () => {
    if (!loteDetalhe || !user) {
      toast.error("Carregando dados do lote, tente novamente.");
      return;
    }
    const origemLoc = loteDetalhe.localizacao_id;
    const { error } = await supabase
      .from("lotes")
      .update({
        status: "em_andamento",
        retomado_em: new Date().toISOString(),
        finalizado_em: null,
        localizacao_id: null,
      })
      .eq("id", loteDetalhe.id);
    if (error) {
      console.error("Erro ao reabrir:", error);
      return toast.error("Erro ao reabrir", { description: error.message });
    }
    const { error: movErr } = await supabase.from("movimentacoes").insert({
      lote_id: loteDetalhe.id,
      tipo: "reabertura",
      localizacao_origem_id: origemLoc,
      usuario_id: user.id,
    });
    if (movErr) console.warn("Mov erro:", movErr);
    await logAudit({
      acao: "reabrir_lote",
      entidade: "lotes",
      entidade_id: loteDetalhe.id,
      descricao: `Lote ${loteDetalhe.nome} reaberto`,
      valor_anterior: { status: loteDetalhe.status, localizacao_id: origemLoc },
      valor_novo: { status: "em_andamento" },
    });
    toast.success("Lote reaberto — você pode adicionar novos itens");
    const loteId = loteDetalhe.id;
    setConfirmAction(null);
    setOpenLoteId(null);
    setReload((r) => r + 1);
    navigate(`/lote/${loteId}`);
  };

  const saida = async () => {
    if (!loteDetalhe || !user) return;
    const { error } = await supabase
      .from("lotes")
      .update({ status: "expedido", expedido_em: new Date().toISOString(), localizacao_id: null })
      .eq("id", loteDetalhe.id);
    if (error) return toast.error("Erro", { description: error.message });
    await supabase.from("movimentacoes").insert({
      lote_id: loteDetalhe.id, tipo: "saida",
      localizacao_origem_id: loteDetalhe.localizacao_id, usuario_id: user.id,
    });
    await logAudit({ acao: "saida_lote", entidade: "lotes", entidade_id: loteDetalhe.id, descricao: "Lote expedido" });
    toast.success("Saída registrada");
    setConfirmAction(null); setOpenLoteId(null); setReload((r) => r + 1);
  };

  const transferir = async () => {
    if (!novaLoc || !loteDetalhe || !user) return;
    const origem = loteDetalhe.localizacao_id;
    const { error } = await supabase
      .from("lotes")
      .update({ localizacao_id: novaLoc.id })
      .eq("id", loteDetalhe.id);
    if (error) return toast.error("Erro", { description: error.message });
    await supabase.from("movimentacoes").insert({
      lote_id: loteDetalhe.id, tipo: "transferencia",
      localizacao_origem_id: origem, localizacao_destino_id: novaLoc.id, usuario_id: user.id,
    });
    await logAudit({
      acao: "transferir_lote", entidade: "lotes", entidade_id: loteDetalhe.id,
      descricao: `Transferido para ${novaLoc.codigo}`,
      valor_novo: { localizacao: novaLoc.codigo },
    });
    toast.success(`Lote transferido para ${novaLoc.codigo}`);
    setTransferindo(false); setNovaLoc(null); setOpenLoteId(null); setReload((r) => r + 1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Mapa do estoque</h2>
        <p className="text-sm text-muted-foreground">Clique em um pallet ocupado para ver detalhes e ações.</p>
      </div>

      <Card className="p-5 overflow-x-auto">
        <MapaEstoque
          onSelectOccupied={(loteId) => setOpenLoteId(loteId)}
          reload={reload}
        />
      </Card>

      <Sheet open={!!openLoteId} onOpenChange={(o) => !o && setOpenLoteId(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          {loteDetalhe && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  {loteDetalhe.nome}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${loteDetalhe.b2b ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {loteDetalhe.b2b ? "B2B" : "Não B2B"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {loteDetalhe.localizacoes?.codigo ?? "Sem localização"}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="corp-label mb-2">Informações</h4>
                  <dl className="text-sm space-y-1.5">
                    <div><dt className="text-muted-foreground inline">Status: </dt><dd className="inline font-medium">{loteDetalhe.status}</dd></div>
                    <div><dt className="text-muted-foreground inline">Iniciado: </dt><dd className="inline">{formatDateTime(loteDetalhe.iniciado_em)}</dd></div>
                    {loteDetalhe.finalizado_em && <div><dt className="text-muted-foreground inline">Finalizado: </dt><dd className="inline">{formatDateTime(loteDetalhe.finalizado_em)}</dd></div>}
                    {loteDetalhe.observacao && <div><dt className="text-muted-foreground inline">Obs: </dt><dd className="inline">{loteDetalhe.observacao}</dd></div>}
                    <div><dt className="text-muted-foreground inline">Itens: </dt><dd className="inline font-medium">{loteDetalhe.itens_lote?.length ?? 0}</dd></div>
                  </dl>
                </div>

                <div>
                  <h4 className="corp-label mb-2">Produtos / Defeitos</h4>
                  <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                    {loteDetalhe.itens_lote?.map((it: any) => (
                      <li key={it.id} className="flex justify-between gap-2 py-1 border-b border-border/50">
                        <span className="truncate">{it.produtos?.nome}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{it.defeitos?.nome ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="corp-label mb-2">Histórico</h4>
                  <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                    {loteDetalhe.movimentacoes?.map((m: any) => (
                      <li key={m.id} className="border-l-2 border-primary pl-2">
                        <div className="font-medium capitalize">{m.tipo}</div>
                        <div className="text-muted-foreground">
                          {m.localizacao_origem?.codigo && `${m.localizacao_origem.codigo} → `}
                          {m.localizacao_destino?.codigo ?? "—"}
                        </div>
                        <div className="text-muted-foreground">{formatDateTime(m.created_at)}</div>
                      </li>
                    )) ?? <li className="text-muted-foreground">Sem movimentações</li>}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button onClick={() => setActionMenu(true)}>
                  <Settings className="h-4 w-4 mr-2" /> Ações
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* popup ações */}
      <Dialog open={actionMenu} onOpenChange={setActionMenu}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ações do lote</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Button variant="outline" className="flex-col h-24" onClick={() => { setActionMenu(false); setConfirmAction("reabrir"); }}>
              <RotateCcw className="h-5 w-5 mb-1" /> Reabrir
            </Button>
            <Button variant="outline" className="flex-col h-24" onClick={() => { setActionMenu(false); setConfirmAction("saida"); }}>
              <LogOut className="h-5 w-5 mb-1" /> Saída
            </Button>
            <Button variant="outline" className="flex-col h-24" onClick={() => { setActionMenu(false); setTransferindo(true); }}>
              <ArrowRightLeft className="h-5 w-5 mb-1" /> Transferência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "reabrir" ? "Reabrir lote?" : "Registrar saída do lote?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "reabrir"
                ? "O lote voltará para 'em andamento' e poderá receber novos itens."
                : "O lote será marcado como expedido e não poderá mais ser alterado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction === "reabrir" ? reabrir : saida}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={transferindo} onOpenChange={(o) => { if (!o) { setTransferindo(false); setNovaLoc(null); } }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transferir lote — escolha a nova localização</DialogTitle>
          </DialogHeader>
          <MapaEstoque selectedId={novaLoc?.id} onSelect={setNovaLoc} modoSelecao />
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => { setTransferindo(false); setNovaLoc(null); }}>Cancelar</Button>
            <Button onClick={transferir} disabled={!novaLoc}>
              Confirmar transferência {novaLoc && `→ ${novaLoc.codigo}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
