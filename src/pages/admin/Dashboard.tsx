import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Boxes, Activity, MapPin, MapPinOff, Package, Pause, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    b2b: 0, naoB2b: 0, finalizadosCom: 0, finalizadosSem: 0, emAndamento: 0, pausados: 0, produtos: 0,
  });
  const [porOperador, setPorOperador] = useState<{ nome: string; total: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [b2bRes, nb2bRes, finComRes, finSemRes, andRes, pauRes, prodRes, opRes] = await Promise.all([
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("b2b", true),
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("b2b", false),
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("status", "finalizado"),
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("status", "sem_localizacao"),
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("status", "em_andamento"),
        supabase.from("lotes").select("id", { count: "exact", head: true }).eq("status", "pausado"),
        supabase.from("produtos").select("id", { count: "exact", head: true }),
        supabase.from("lotes").select("operador_id, profiles!inner(nome)"),
      ]);

      setStats({
        b2b: b2bRes.count ?? 0,
        naoB2b: nb2bRes.count ?? 0,
        finalizadosCom: finComRes.count ?? 0,
        finalizadosSem: finSemRes.count ?? 0,
        emAndamento: andRes.count ?? 0,
        pausados: pauRes.count ?? 0,
        produtos: prodRes.count ?? 0,
      });

      const counts = new Map<string, number>();
      (opRes.data ?? []).forEach((row: any) => {
        const nome = row.profiles?.nome ?? "—";
        counts.set(nome, (counts.get(nome) ?? 0) + 1);
      });
      setPorOperador(Array.from(counts.entries()).map(([nome, total]) => ({ nome, total })));
    };
    load();
  }, []);

  const tipoData = [
    { name: "B2B", value: stats.b2b, fill: "hsl(var(--primary))" },
    { name: "Não B2B", value: stats.naoB2b, fill: "hsl(var(--pallet-other))" },
  ];

  const cards = [
    { label: "Lotes em andamento", value: stats.emAndamento, icon: Activity, color: "text-info" },
    { label: "Lotes pausados", value: stats.pausados, icon: Pause, color: "text-warning" },
    { label: "Finalizados c/ localização", value: stats.finalizadosCom, icon: MapPin, color: "text-success" },
    { label: "Finalizados sem localização", value: stats.finalizadosSem, icon: MapPinOff, color: "text-destructive" },
    { label: "Produtos cadastrados", value: stats.produtos, icon: Package, color: "text-primary" },
    { label: "Total B2B", value: stats.b2b, icon: Boxes, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visão consolidada da operação. Preparado para integração futura com planilha mestra.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <c.icon className={`h-5 w-5 ${c.color} mb-2`} />
            <div className="corp-stat-value">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="corp-section-title mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Lotes por tipo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={tipoData} dataKey="value" nameKey="name" outerRadius={90} label>
                {tipoData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="corp-section-title mb-4">Produtividade por operador</h3>
          {porOperador.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={porOperador}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-4 border-dashed">
        <p className="text-xs text-muted-foreground">
          📊 Este dashboard está preparado para receber dados de uma planilha mestra externa (caminho configurável). Integração futura.
        </p>
      </Card>
    </div>
  );
}
