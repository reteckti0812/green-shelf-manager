import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Link } from "react-router-dom";

export default function TempoReal() {
  const [lotes, setLotes] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("lotes")
      .select("*, profiles!operador_id(nome), itens_lote(count)")
      .in("status", ["em_andamento", "pausado"])
      .order("iniciado_em", { ascending: false });
    setLotes(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("tempo-real")
      .on("postgres_changes", { event: "*", schema: "public", table: "lotes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_lote" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tempo real</h2>
          <p className="text-sm text-muted-foreground">Acompanhamento ao vivo dos lotes em operação.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
          Atualização automática
        </div>
      </div>

      {lotes.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum lote em operação no momento.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes.map((l) => (
            <Link key={l.id} to={`/lote/${l.id}`}>
              <Card className="p-4 hover:border-primary transition-colors h-full">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold truncate">{l.nome}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    l.status === "pausado" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
                  }`}>
                    {l.status === "pausado" ? "Pausado" : "Em andamento"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Operador: <span className="text-foreground font-medium">{l.profiles?.nome ?? "—"}</span></div>
                  <div>Itens: <span className="text-foreground font-medium">{l.itens_lote?.[0]?.count ?? 0}</span></div>
                  <div>Início: {formatDateTime(l.iniciado_em)}</div>
                  <div>Tipo: {l.b2b ? "B2B" : "Não B2B"}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
