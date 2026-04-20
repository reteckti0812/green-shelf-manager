import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PauseCircle, Play } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Lote {
  id: string;
  nome: string;
  b2b: boolean;
  observacao: string | null;
  pausado_em: string | null;
}

export default function LotesPausados() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase.from("lotes").select("*").eq("status", "pausado").order("pausado_em", { ascending: false });
    setLotes((data as Lote[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const retomar = async (lote: Lote) => {
    // Acumula o tempo que o lote ficou pausado para que o timer não conte a pausa
    const { data: atual } = await supabase
      .from("lotes")
      .select("pausa_acumulada_seg, pausado_em")
      .eq("id", lote.id)
      .maybeSingle();
    const pausaExtra = atual?.pausado_em
      ? Math.max(0, Math.floor((Date.now() - new Date(atual.pausado_em).getTime()) / 1000))
      : 0;
    const novaAcumulada = (atual?.pausa_acumulada_seg ?? 0) + pausaExtra;

    const { error } = await supabase
      .from("lotes")
      .update({
        status: "em_andamento",
        retomado_em: new Date().toISOString(),
        pausado_em: null,
        pausa_acumulada_seg: novaAcumulada,
      })
      .eq("id", lote.id);
    if (error) return toast.error("Erro ao retomar", { description: error.message });
    await logAudit({
      acao: "retomar_lote",
      entidade: "lotes",
      entidade_id: lote.id,
      descricao: `Lote ${lote.nome} retomado (+${pausaExtra}s de pausa acumulados)`,
    });
    toast.success("Lote retomado");
    navigate(`/lote/${lote.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Lotes pausados</h2>
      {lotes.length === 0 ? (
        <Card className="p-12 text-center">
          <PauseCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum lote pausado no momento.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes.map((l) => (
            <Card key={l.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold truncate">{l.nome}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${l.b2b ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {l.b2b ? "B2B" : "Não B2B"}
                </span>
              </div>
              {l.observacao && <p className="text-sm text-muted-foreground line-clamp-2">{l.observacao}</p>}
              <p className="text-xs text-muted-foreground">Pausado em: {l.pausado_em ? formatDateTime(l.pausado_em) : "—"}</p>
              <Button onClick={() => retomar(l)} className="w-full" size="sm">
                <Play className="h-4 w-4 mr-2" /> Retomar lote
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
