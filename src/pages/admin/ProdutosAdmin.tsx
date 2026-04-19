import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

interface Produto { id: string; nome: string; marca: string | null }

export default function ProdutosAdmin() {
  const [items, setItems] = useState<Produto[]>([]);
  const [filterNome, setFilterNome] = useState("");
  const [filterMarca, setFilterMarca] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [deleting, setDeleting] = useState<Produto | null>(null);
  const [form, setForm] = useState({ nome: "", marca: "" });

  const load = async () => {
    const { data } = await supabase.from("produtos").select("id,nome,marca").order("nome");
    setItems((data as Produto[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) =>
    i.nome.toLowerCase().includes(filterNome.toLowerCase()) &&
    (i.marca ?? "").toLowerCase().includes(filterMarca.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm({ nome: "", marca: "" }); setOpen(true); };
  const openEdit = (p: Produto) => { setEditing(p); setForm({ nome: p.nome, marca: p.marca ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    if (editing) {
      const { error } = await supabase.from("produtos").update({ nome: form.nome, marca: form.marca || null }).eq("id", editing.id);
      if (error) return toast.error("Erro", { description: error.message });
      await logAudit({ acao: "editar_produto", entidade: "produtos", entidade_id: editing.id, descricao: form.nome, valor_anterior: editing, valor_novo: form });
    } else {
      const { data, error } = await supabase.from("produtos").insert({ nome: form.nome, marca: form.marca || null }).select().single();
      if (error) return toast.error("Erro", { description: error.message });
      await logAudit({ acao: "criar_produto", entidade: "produtos", entidade_id: data?.id, descricao: form.nome, valor_novo: form });
    }
    toast.success("Salvo");
    setOpen(false); load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("produtos").delete().eq("id", deleting.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    await logAudit({ acao: "excluir_produto", entidade: "produtos", entidade_id: deleting.id, descricao: deleting.nome, valor_anterior: deleting });
    toast.success("Produto excluído");
    setDeleting(null); load();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-sm text-muted-foreground">{items.length} cadastrados</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo produto</Button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <span><strong>Lembrete:</strong> sempre retire as etiquetas dos produtos antes de cadastrar e operar.</span>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Input placeholder="Filtrar por nome..." value={filterNome} onChange={(e) => setFilterNome(e.target.value)} />
          <Input placeholder="Filtrar por marca..." value={filterMarca} onChange={(e) => setFilterMarca(e.target.value)} />
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead>Marca</TableHead><TableHead className="w-32">Ações</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum produto encontrado.</TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.marca ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleting?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente e não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
