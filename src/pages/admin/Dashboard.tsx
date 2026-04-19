import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, AlertCircle, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Dashboard preparado para integração futura com planilha mestra externa.
 * Não exibe dados internos do sistema. Apenas estrutura + estado vazio + configuração.
 */
export default function Dashboard() {
  const [planilhaUrl, setPlanilhaUrl] = useState(localStorage.getItem("planilha_mestra_url") ?? "");
  const [salvando, setSalvando] = useState(false);

  const salvarConfig = () => {
    setSalvando(true);
    localStorage.setItem("planilha_mestra_url", planilhaUrl);
    setTimeout(() => {
      setSalvando(false);
      toast.success("Configuração salva. Integração será ativada em versão futura.");
    }, 300);
  };

  const placeholders = [
    "Lotes B2B vs Não B2B",
    "Produtividade por operador",
    "Total de lotes finalizados",
    "Lotes sem localização",
    "Lotes sem finalização",
    "Total de produtos cadastrados",
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Painel consolidado a partir da <strong>planilha mestra</strong> externa.
        </p>
      </div>

      {/* Aviso de fonte não configurada */}
      <Card className="p-5 border-warning/40 bg-warning/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Fonte de dados não configurada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              O dashboard exibirá métricas reais assim que a planilha mestra for conectada.
              Enquanto isso, nenhum dado interno do sistema é mostrado aqui.
            </p>
          </div>
        </div>
      </Card>

      {/* Configuração da fonte */}
      <Card className="p-5">
        <h3 className="corp-section-title mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Configuração da fonte de dados
        </h3>
        <div className="space-y-3 max-w-2xl">
          <div className="space-y-1.5">
            <Label htmlFor="planilha">URL/caminho da planilha mestra</Label>
            <Input
              id="planilha"
              placeholder="https://docs.google.com/spreadsheets/... ou caminho da rede"
              value={planilhaUrl}
              onChange={(e) => setPlanilhaUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A integração efetiva será habilitada em versão futura. O caminho fica salvo localmente até lá.
            </p>
          </div>
          <Button onClick={salvarConfig} disabled={salvando}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Salvar configuração
          </Button>
        </div>
      </Card>

      {/* Estrutura de cards vazios (placeholder do layout futuro) */}
      <div>
        <div className="corp-label mb-3">Métricas previstas</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {placeholders.map((label) => (
            <Card key={label} className="p-5 border-dashed">
              <div className="text-3xl font-bold text-muted-foreground/30 mb-1">—</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Áreas reservadas para gráficos */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 border-dashed">
          <h3 className="corp-section-title mb-2">Lotes por tipo</h3>
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            Aguardando conexão com planilha mestra
          </div>
        </Card>
        <Card className="p-5 border-dashed">
          <h3 className="corp-section-title mb-2">Produtividade por operador</h3>
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            Aguardando conexão com planilha mestra
          </div>
        </Card>
      </div>
    </div>
  );
}
