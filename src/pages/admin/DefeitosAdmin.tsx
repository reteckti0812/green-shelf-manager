import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

interface Defeito { id: string; nome: string; descricao: string | null; ativo: boolean }

export default function DefeitosAdmin() {
  const [items, setItems] = useState<Defeito[]>([]);
  const [filterNome, setFilterNome] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Defeito | null>(null);
  const [deleting, setDeleting] = useState<Defeito | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const load = async () => {
    const { data } = await supabase.from("defeitos").select("*").order("nome");
    setItems((data as Defeito[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => i.nome.toLowerCase().includes(filterNome.toLowerCase()));

  const openNew = () => { setEditing(null); setForm({ nome: "", descricao: "" }); setOpen(true); };
  const openEdit = (d: Defeito) => { setEditing(d); setForm({ nome: d.nome, descricao: d.descricao ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    if (editing) {
      const { error } = await supabase.from("defeitos").update({ nome: form.nome, descricao: form.descricao || null }).eq("id", editing.id);
      if (error) return toast.error("Erro", { description: error.message });
      await logAudit({ acao: "editar_defeito", entidade: "defeitos", entidade_id: editing.id, valor_anterior: editing, valor_novo: form });
    } else {
      const { data, error } = await supabase.from("defeitos").insert({ nome: form.nome, descricao: form.descricao || null }).select().single();
      if (error) return toast.error("Erro", { description: error.message });
      await logAudit({ acao: "criar_defeito", entidade: "defeitos", entidade_id: data?.id, valor_novo: form });
    }
    toast.success("Salvo");
    setOpen(false); load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("defeitos").update({ ativo: false }).eq("id", deleting.id);
    if (error) return toast.error("Erro", { description: error.message });
    await logAudit({ acao: "excluir_defeito", entidade: "defeitos", entidade_id: deleting.id, valor_anterior: deleting });
    toast.success("Defeito desativado");
    setDeleting(null); load();
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Defeitos</h2>
          <p className="text-sm text-muted-foreground">{items.length} cadastrados</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo defeito</Button>
      </div>

      <Card className="p-4">
        <Input className="mb-4" placeholder="Filtrar por nome..." value={filterNome} onChange={(e) => setFilterNome(e.target.value)} />
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead className="w-32">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum defeito.</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.descricao ?? "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded ${d.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{d.ativo ? "Ativo" : "Inativo"}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleting(d)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar defeito" : "Novo defeito"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Desativar defeito?</AlertDialogTitle><AlertDialogDescription>Não aparecerá mais no cadastro de itens.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
