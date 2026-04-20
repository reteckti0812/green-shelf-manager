import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPinOff, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface Lote {
  id: string;
  nome: string;
  b2b: boolean;
  observacao: string | null;
  finalizado_em: string | null;
}

export default function LotesSemLocalizacao() {
  const [lotes, setLotes] = useState<(Lote & { itens: number })[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase
      .from("lotes")
      .select("*, itens_lote(count)")
      .eq("status", "sem_localizacao")
      .order("finalizado_em", { ascending: false });
    setLotes((data ?? []).map((l: any) => ({ ...l, itens: l.itens_lote?.[0]?.count ?? 0 })));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Lotes sem localização</h2>
      {lotes.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPinOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Todos os lotes estão endereçados.</p>
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
              <p className="text-xs text-muted-foreground">{l.itens} {l.itens === 1 ? "item" : "itens"}</p>
              {l.observacao && <p className="text-sm text-muted-foreground line-clamp-2">{l.observacao}</p>}
              <p className="text-xs text-muted-foreground">Finalizado: {l.finalizado_em ? formatDateTime(l.finalizado_em) : "—"}</p>
              <Button onClick={() => navigate(`/finalizar/${l.id}?endereçar=1`)} className="w-full" size="sm">
                <MapPin className="h-4 w-4 mr-2" /> Endereçar no mapa
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
