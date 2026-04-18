import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { MapaEstoque, Localizacao } from "@/components/mapa/MapaEstoque";

export default function FinalizarLote() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const isEnderecando = params.get("endereçar") === "1" || params.get("enderecar") === "1";
  const navigate = useNavigate();
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [lote, setLote] = useState<any>(null);
  const [selected, setSelected] = useState<Localizacao | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("lotes").select("*").eq("id", id).maybeSingle().then(({ data }) => setLote(data));
  }, [id]);

  const finalizarComLoc = async () => {
    if (!selected || !lote || !user) return;
    const { error } = await supabase
      .from("lotes")
      .update({
        localizacao_id: selected.id,
        status: "finalizado",
        finalizado_em: lote.finalizado_em ?? new Date().toISOString(),
      })
      .eq("id", lote.id);
    if (error) return toast.error("Erro", { description: error.message });
    await supabase.from("movimentacoes").insert({
      lote_id: lote.id,
      tipo: "alocacao",
      localizacao_destino_id: selected.id,
      usuario_id: user.id,
      observacao: isEnderecando ? "Endereçamento posterior" : "Alocação na finalização",
    });
    await logAudit({
      acao: isEnderecando ? "enderecar_lote" : "finalizar_lote",
      entidade: "lotes",
      entidade_id: lote.id,
      descricao: `Lote alocado em ${selected.codigo}`,
      valor_novo: { localizacao: selected.codigo },
    });
    toast.success(`Lote alocado em ${selected.codigo}`);
    navigate("/mapa");
  };

  const finalizarSemLoc = async () => {
    if (!lote || !user) return;
    const { error } = await supabase
      .from("lotes")
      .update({ status: "sem_localizacao", finalizado_em: new Date().toISOString() })
      .eq("id", lote.id);
    if (error) return toast.error("Erro", { description: error.message });
    await logAudit({
      acao: "finalizar_sem_localizacao",
      entidade: "lotes",
      entidade_id: lote.id,
      descricao: "Lote finalizado sem localização",
    });
    toast.success("Lote finalizado sem localização");
    navigate("/lotes-sem-localizacao");
  };

  if (!lote) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{isEnderecando ? "Endereçar lote no mapa" : "Finalizar lote"}</h2>
          <p className="text-sm text-muted-foreground">
            {lote.nome} · <span className={lote.b2b ? "text-primary font-medium" : ""}>{lote.b2b ? "B2B" : "Não B2B"}</span>
            {selected && <> · localização escolhida: <strong>{selected.codigo}</strong></>}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(isEnderecando ? "/lotes-sem-localizacao" : `/lote/${lote.id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Cancelar
        </Button>
      </div>

      <Card className="p-5">
        <MapaEstoque selectedId={selected?.id} onSelect={setSelected} modoSelecao />
      </Card>

      <div className="flex gap-3 justify-end sticky bottom-0 bg-background py-3 border-t">
        {!isEnderecando && (
          <Button variant="outline" onClick={finalizarSemLoc} disabled={!online}>
            Finalizar sem localização
          </Button>
        )}
        <Button onClick={finalizarComLoc} disabled={!selected || !online} size="lg">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {isEnderecando ? "Salvar localização" : "Finalizar e alocar"}
        </Button>
      </div>
    </div>
  );
}
