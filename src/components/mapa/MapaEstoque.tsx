import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface Localizacao {
  id: string;
  codigo: string;
  rua: number;
  coluna: number;
  nivel: number;
}

export interface LoteOcupado {
  id: string;
  nome: string;
  b2b: boolean;
  status: string;
  localizacao_id: string | null;
}

interface MapaProps {
  selectedId?: string | null;
  onSelect?: (loc: Localizacao | null) => void;
  highlightLoteId?: string | null;
  onSelectOccupied?: (loteId: string) => void;
  /** se true, só permite clicar em pallets vazios */
  modoSelecao?: boolean;
  reload?: number;
}

export function MapaEstoque({
  selectedId,
  onSelect,
  highlightLoteId,
  onSelectOccupied,
  modoSelecao = false,
  reload = 0,
}: MapaProps) {
  const [locs, setLocs] = useState<Localizacao[]>([]);
  const [lotes, setLotes] = useState<LoteOcupado[]>([]);
  const [ruaSelecionada, setRuaSelecionada] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("localizacoes").select("*").order("rua").order("coluna").order("nivel"),
      supabase
        .from("lotes")
        .select("id,nome,b2b,status,localizacao_id")
        .not("localizacao_id", "is", null)
        .neq("status", "expedido"),
    ]).then(([l, lt]) => {
      setLocs((l.data as Localizacao[]) ?? []);
      setLotes((lt.data as LoteOcupado[]) ?? []);
    });
  }, [reload]);

  // realtime: atualiza quando lotes mudam (canal único por instância para evitar colisão)
  useEffect(() => {
    const channelName = `mapa-lotes-${Math.random().toString(36).slice(2)}`;
    const refetch = () => {
      supabase
        .from("lotes")
        .select("id,nome,b2b,status,localizacao_id")
        .not("localizacao_id", "is", null)
        .neq("status", "expedido")
        .then(({ data }) => setLotes((data as LoteOcupado[]) ?? []));
    };
    const ch = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "lotes" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes" }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const ocupadasMap = useMemo(() => {
    const m = new Map<string, LoteOcupado>();
    lotes.forEach((l) => l.localizacao_id && m.set(l.localizacao_id, l));
    return m;
  }, [lotes]);

  // group by rua -> coluna -> niveis
  const ruas = useMemo(() => {
    const map = new Map<number, Map<number, Localizacao[]>>();
    locs.forEach((l) => {
      if (!map.has(l.rua)) map.set(l.rua, new Map());
      const ruaMap = map.get(l.rua)!;
      if (!ruaMap.has(l.coluna)) ruaMap.set(l.coluna, []);
      ruaMap.get(l.coluna)!.push(l);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rua, cols]) => ({
        rua,
        colunas: Array.from(cols.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([col, niveis]) => ({
            coluna: col,
            niveis: niveis.sort((a, b) => b.nivel - a.nivel),
          })),
      }));
  }, [locs]);

  // se uma localização foi selecionada externamente, abre a rua dela
  useEffect(() => {
    if (selectedId) {
      const loc = locs.find((l) => l.id === selectedId);
      if (loc) setRuaSelecionada(loc.rua);
    }
  }, [selectedId, locs]);

  // abre a primeira rua por padrão para não exibir tela em branco
  useEffect(() => {
    if (ruaSelecionada === null && ruas.length > 0) {
      setRuaSelecionada(ruas[0].rua);
    }
  }, [ruas, ruaSelecionada]);

  // contagem de ocupação por rua
  const statsRua = useMemo(() => {
    const stats = new Map<number, { total: number; ocupados: number }>();
    locs.forEach((l) => {
      const cur = stats.get(l.rua) ?? { total: 0, ocupados: 0 };
      cur.total++;
      if (ocupadasMap.has(l.id)) cur.ocupados++;
      stats.set(l.rua, cur);
    });
    return stats;
  }, [locs, ocupadasMap]);

  if (locs.length === 0) return <div className="text-muted-foreground text-sm">Carregando mapa...</div>;

  const ruaAtual = ruas.find((r) => r.rua === ruaSelecionada);

  return (
    <div className="space-y-4">
      {/* Seletor de ruas */}
      <div>
        <div className="corp-label mb-2">Selecione uma rua</div>
        <div className="flex flex-wrap gap-1.5">
          {ruas.map(({ rua }) => {
            const s = statsRua.get(rua);
            const isActive = ruaSelecionada === rua;
            return (
              <button
                key={rua}
                onClick={() => setRuaSelecionada(isActive ? null : rua)}
                className={cn(
                  "px-3 py-2 rounded-md text-xs font-medium transition-all border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-muted border-border text-foreground"
                )}
              >
                <div className="font-bold">Rua {String(rua).padStart(2, "0")}</div>
                {s && (
                  <div className={cn("text-[10px] mt-0.5", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {s.ocupados}/{s.total}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mapa da rua selecionada */}
      {!ruaAtual ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
          Clique em uma rua acima para visualizar os pallets.
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                {String(ruaAtual.rua).padStart(2, "0")}
              </div>
              <div>
                <div className="font-semibold text-sm">Rua {String(ruaAtual.rua).padStart(2, "0")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {ruaAtual.colunas.length} colunas · {ruaAtual.colunas[0]?.niveis.length ?? 0} níveis
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRuaSelecionada(null)}>
              Voltar à seleção
            </Button>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1.5 min-w-min">
              {ruaAtual.colunas.map(({ coluna, niveis }) => (
                <div key={coluna} className="flex flex-col gap-0.5">
                  {niveis.map((loc) => {
                    const occ = ocupadasMap.get(loc.id);
                    const isSelected = selectedId === loc.id;
                    const isHighlight = highlightLoteId && occ?.id === highlightLoteId;
                    const clickable = !modoSelecao || !occ;

                    let bg = "bg-pallet-empty text-pallet-empty-foreground";
                    if (occ) {
                      bg = occ.b2b
                        ? "bg-pallet-b2b text-pallet-b2b-foreground"
                        : "bg-pallet-other text-pallet-other-foreground";
                    }

                    return (
                      <button
                        key={loc.id}
                        title={`${loc.codigo}${occ ? ` — ${occ.nome}` : " — vazio"}`}
                        onClick={() => {
                          if (occ && onSelectOccupied) return onSelectOccupied(occ.id);
                          if (!occ && onSelect && clickable) onSelect(isSelected ? null : loc);
                        }}
                        className={cn(
                          "h-8 w-8 rounded-sm text-[10px] font-mono leading-none flex items-center justify-center transition-all",
                          bg,
                          isSelected && "ring-2 ring-warning ring-offset-1",
                          isHighlight && "ring-2 ring-info ring-offset-1 animate-pulse-soft",
                          clickable && "hover:scale-110 cursor-pointer",
                          !clickable && !occ && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {loc.nivel}
                      </button>
                    );
                  })}
                  <div className="text-[9px] text-center text-muted-foreground mt-0.5 font-mono">{coluna}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-3 border-t text-xs">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pallet-b2b"></span>B2B</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pallet-other"></span>Outros</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pallet-empty border border-border"></span>Vazio</div>
      </div>
    </div>
  );
}
