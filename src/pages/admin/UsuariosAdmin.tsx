import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export default function UsuariosAdmin() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "", cargo: "Operador", role: "operador" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("nome");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profs ?? []).map((p) => ({
      ...p,
      role: roles?.find((r: any) => r.user_id === p.user_id)?.role ?? "operador",
    }));
    setProfiles(merged);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome.trim() || !form.email.trim() || form.password.length < 6) {
      return toast.error("Preencha nome, e-mail e senha (mín. 6 caracteres).");
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: form.nome, cargo: form.cargo, role: form.role },
      },
    });
    setSubmitting(false);
    if (error) return toast.error("Erro", { description: error.message });
    await logAudit({ acao: "criar_usuario", entidade: "profiles", entidade_id: data.user?.id, descricao: `${form.nome} (${form.role})` });
    toast.success("Usuário criado");
    setOpen(false);
    setForm({ nome: "", email: "", password: "", cargo: "Operador", role: "operador" });
    load();
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-sm text-muted-foreground">{profiles.length} cadastrados</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo usuário</Button>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Perfil</TableHead></TableRow></TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.cargo ?? "—"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${p.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {p.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                    {p.role === "admin" ? "Administrador" : "Operador"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Senha *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={submitting}>Criar usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
