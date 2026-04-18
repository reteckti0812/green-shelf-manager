import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { History } from "lucide-react";

export default function AuditoriaAdmin() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profMap, setProfMap] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState({ usuario: "", acao: "", data: "" });

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: profs }] = await Promise.all([
        supabase.from("auditoria").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("user_id,nome"),
      ]);
      setLogs(l ?? []);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { m[p.user_id] = p.nome; });
      setProfMap(m);
    };
    load();
  }, []);

  const filtered = logs.filter((l) => {
    const nome = profMap[l.usuario_id] ?? "";
    if (filtro.usuario && !nome.toLowerCase().includes(filtro.usuario.toLowerCase())) return false;
    if (filtro.acao && !l.acao.toLowerCase().includes(filtro.acao.toLowerCase())) return false;
    if (filtro.data && !l.created_at.startsWith(filtro.data)) return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Auditoria</h2>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Input placeholder="Filtrar por usuário..." value={filtro.usuario} onChange={(e) => setFiltro({ ...filtro, usuario: e.target.value })} />
          <Input placeholder="Filtrar por ação..." value={filtro.acao} onChange={(e) => setFiltro({ ...filtro, acao: e.target.value })} />
          <Input type="date" value={filtro.data} onChange={(e) => setFiltro({ ...filtro, data: e.target.value })} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem registros.</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</TableCell>
                  <TableCell className="text-sm">{profMap[l.usuario_id] ?? "—"}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{l.acao}</code></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.entidade}</TableCell>
                  <TableCell className="text-sm">{l.descricao ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Mostrando até 500 registros mais recentes.</p>
      </Card>
    </div>
  );
}
