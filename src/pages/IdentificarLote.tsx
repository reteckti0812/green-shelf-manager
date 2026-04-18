import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { AlertTriangle, MapPinOff, PauseCircle, Play, Tag } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Link } from "react-router-dom";

interface Legenda {
  id: string;
  sigla: string;
  descricao: string | null;
  cor: string;
}

export default function IdentificarLote() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [nome, setNome] = useState("");
  const [b2b, setB2b] = useState<"sim" | "nao">("nao");
  const [observacao, setObservacao] = useState("");
  const [legendas, setLegendas] = useState<Legenda[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState({ pausados: 0, semLoc: 0 });

  useEffect(() => {
    supabase.from("legendas").select("*").eq("ativo", true).then(({ data }) => {
      setLegendas((data as Legenda[]) ?? []);
    });

    const loadCounts = async () => {
      const [pausadosRes, semLocRes] = await Promise.all([
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("status", "pausado"),
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("status", "sem_localizacao"),
      ]);
      setCounts({
        pausados: pausadosRes.count ?? 0,
        semLoc: semLocRes.count ?? 0,
      });
    };
    loadCounts();
  }, []);

  const iniciar = async () => {
    if (!online) {
      toast.error("Sem conexão. Aguarde o retorno da internet.");
      return;
    }
    if (!nome.trim()) {
      toast.error("Informe o nome do lote.");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("lotes")
      .insert({
        nome: nome.trim(),
        b2b: b2b === "sim",
        observacao: observacao.trim() || null,
        status: "em_andamento",
        operador_id: user.id,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error("Erro ao iniciar lote", { description: error?.message });
      return;
    }
    await logAudit({
      acao: "iniciar_lote",
      entidade: "lotes",
      entidade_id: data.id,
      descricao: `Lote "${data.nome}" iniciado`,
      valor_novo: data,
    });
    toast.success("Lote iniciado");
    navigate(`/lote/${data.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Identificar novo lote</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os dados do gaylord recebido para iniciar a triagem.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 corp-card p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome do lote <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Gaylord 2025-04-18 #03"
              disabled={!online}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Tipo de lote <span className="text-destructive">*</span>
            </Label>
            <RadioGroup value={b2b} onValueChange={(v) => setB2b(v as "sim" | "nao")} className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-colors ${
                  b2b === "sim" ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"
                }`}
              >
                <RadioGroupItem value="sim" id="sim" />
                <div>
                  <div className="font-medium text-sm">B2B</div>
                  <div className="text-xs text-muted-foreground">Pallet ficará verde no mapa</div>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-colors ${
                  b2b === "nao" ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"
                }`}
              >
                <RadioGroupItem value="nao" id="nao" />
                <div>
                  <div className="font-medium text-sm">Não B2B</div>
                  <div className="text-xs text-muted-foreground">Pallet ficará cinza escuro</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais sobre o lote"
              rows={3}
              disabled={!online}
            />
          </div>

          <Button onClick={iniciar} disabled={submitting || !online} size="lg" className="w-full">
            <Play className="h-4 w-4 mr-2" />
            Iniciar lote
          </Button>

          <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <span className="text-foreground">
              <strong>Atenção:</strong> ao cadastrar produtos, sempre <u>retire as etiquetas</u> dos itens antes de
              registrar.
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Legendas</h3>
            </div>
            {legendas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma legenda cadastrada.</p>
            ) : (
              <ul className="space-y-2">
                {legendas.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: l.cor }}
                    >
                      {l.sigla}
                    </span>
                    <span className="text-muted-foreground text-xs">{l.descricao}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Link to="/lotes-pausados">
            <Card className="p-4 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PauseCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Lotes pausados</span>
                </div>
                <span className="text-lg font-bold">{counts.pausados}</span>
              </div>
            </Card>
          </Link>

          <Link to="/lotes-sem-localizacao">
            <Card className="p-4 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPinOff className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium">Sem localização</span>
                </div>
                <span className="text-lg font-bold">{counts.semLoc}</span>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
