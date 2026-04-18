import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
            niveis: niveis.sort((a, b) => b.nivel - a.nivel), // alto -> baixo
          })),
      }));
  }, [locs]);

  if (locs.length === 0) return <div className="text-muted-foreground text-sm">Carregando mapa...</div>;

  return (
    <div className="space-y-4 overflow-x-auto pb-3">
      {ruas.map(({ rua, colunas }) => (
        <div key={rua} className="flex items-stretch gap-3">
          <div className="w-12 shrink-0 flex items-center justify-center bg-muted rounded-md">
            <div className="text-center">
              <div className="text-[10px] uppercase text-muted-foreground">Rua</div>
              <div className="text-lg font-bold text-primary">{String(rua).padStart(2, "0")}</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {colunas.map(({ coluna, niveis }) => (
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
                        "h-7 w-7 rounded-sm text-[9px] font-mono leading-none flex items-center justify-center transition-all",
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
                <div className="text-[9px] text-center text-muted-foreground mt-0.5">{coluna}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 pt-3 border-t text-xs">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pallet-b2b"></span>B2B</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pallet-other"></span>Outros</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-pallet-empty border border-border"></span>Vazio</div>
      </div>
    </div>
  );
}
