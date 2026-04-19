import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit2, Plus, ShieldCheck, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/hooks/useAuth";

interface ProfileRow {
  id: string;
  user_id: string;
  nome: string;
  cargo: string | null;
  role: "admin" | "operador";
}

const blankForm = { nome: "", email: "", password: "", cargo: "Operador", role: "operador" as "operador" | "admin" };

export default function UsuariosAdmin() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState(blankForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("nome");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged: ProfileRow[] = (profs ?? []).map((p: any) => ({
      ...p,
      role: (roles?.find((r: any) => r.user_id === p.user_id)?.role ?? "operador") as "admin" | "operador",
    }));
    setProfiles(merged);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(blankForm); setOpen(true); };
  const openEdit = (p: ProfileRow) => {
    setEditing(p);
    setForm({ nome: p.nome, email: "", password: "", cargo: p.cargo ?? "Operador", role: p.role });
    setOpen(true);
  };

  const callAdminFn = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!editing && (!form.email.trim() || !form.password.trim())) {
      return toast.error("E-mail e senha são obrigatórios para criar usuário");
    }
    setSubmitting(true);
    try {
      if (editing) {
        await callAdminFn("update", {
          user_id: editing.user_id,
          email: form.email.trim() || undefined,
          password: form.password.trim() || undefined,
          nome: form.nome,
          cargo: form.cargo,
          role: form.role,
        });
        await logAudit({
          acao: "editar_usuario", entidade: "profiles", entidade_id: editing.user_id,
          descricao: `${form.nome} (${form.role})`,
          valor_anterior: editing, valor_novo: { nome: form.nome, cargo: form.cargo, role: form.role },
        });
        toast.success("Usuário atualizado");
      } else {
        const data: any = await callAdminFn("create", {
          email: form.email, password: form.password, nome: form.nome, cargo: form.cargo, role: form.role,
        });
        await logAudit({
          acao: "criar_usuario", entidade: "profiles", entidade_id: data?.user?.id,
          descricao: `${form.nome} (${form.role})`,
        });
        toast.success("Usuário criado");
      }
      setOpen(false);
      setForm(blankForm);
      load();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    if (deleting.user_id === currentUser?.id) {
      toast.error("Você não pode excluir seu próprio usuário.");
      setDeleting(null);
      return;
    }
    try {
      await callAdminFn("delete", { user_id: deleting.user_id });
      await logAudit({
        acao: "excluir_usuario", entidade: "profiles", entidade_id: deleting.user_id,
        descricao: deleting.nome, valor_anterior: deleting,
      });
      toast.success("Usuário excluído");
      setDeleting(null);
      load();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-sm text-muted-foreground">{profiles.length} cadastrados</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo usuário</Button>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
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
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="text-destructive"
                      disabled={p.user_id === currentUser?.id}
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.nome}` : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail {editing ? "(deixe em branco para manter)" : "*"}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha {editing ? "(deixe em branco para manter)" : "*"}</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Sem restrições de complexidade ou tamanho mínimo.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
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
            <Button onClick={save} disabled={submitting}>
              {editing ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleting?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será removido permanentemente do sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
