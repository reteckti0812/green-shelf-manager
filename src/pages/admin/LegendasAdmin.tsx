import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

interface Legenda { id: string; sigla: string; descricao: string | null; cor: string }

export default function LegendasAdmin() {
  const [items, setItems] = useState<Legenda[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Legenda | null>(null);
  const [deleting, setDeleting] = useState<Legenda | null>(null);
  const [form, setForm] = useState({ sigla: "", descricao: "", cor: "#10b981" });

  const load = async () => {
    const { data } = await supabase.from("legendas").select("id,sigla,descricao,cor").order("sigla");
    setItems((data as Legenda[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ sigla: "", descricao: "", cor: "#10b981" }); setOpen(true); };
  const openEdit = (l: Legenda) => { setEditing(l); setForm({ sigla: l.sigla, descricao: l.descricao ?? "", cor: l.cor }); setOpen(true); };

  const save = async () => {
    if (!form.sigla.trim()) return toast.error("Sigla obrigatória");
    if (editing) {
      const { error } = await supabase.from("legendas").update({ sigla: form.sigla, descricao: form.descricao || null, cor: form.cor }).eq("id", editing.id);
      if (error) return toast.error("Erro", { description: error.message });
      await logAudit({ acao: "editar_legenda", entidade: "legendas", entidade_id: editing.id, valor_anterior: editing, valor_novo: form });
    } else {
      const { data, error } = await supabase.from("legendas").insert({ sigla: form.sigla, descricao: form.descricao || null, cor: form.cor }).select().single();
      if (error) return toast.error("Erro", { description: error.message });
      await logAudit({ acao: "criar_legenda", entidade: "legendas", entidade_id: data?.id, valor_novo: form });
    }
    toast.success("Salvo");
    setOpen(false); load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("legendas").delete().eq("id", deleting.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    await logAudit({ acao: "excluir_legenda", entidade: "legendas", entidade_id: deleting.id, valor_anterior: deleting });
    toast.success("Legenda excluída");
    setDeleting(null); load();
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Legendas</h2>
          <p className="text-sm text-muted-foreground">Aparecem como guia visual para o operador.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova legenda</Button>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Sigla</TableHead><TableHead>Descrição</TableHead><TableHead>Cor</TableHead><TableHead className="w-32">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id}>
                <TableCell><span className="px-2 py-0.5 rounded text-white font-bold text-xs" style={{ backgroundColor: l.cor }}>{l.sigla}</span></TableCell>
                <TableCell>{l.descricao ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{l.cor}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleting(l)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar legenda" : "Nova legenda"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Sigla *</Label><Input value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })} maxLength={6} /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cor</Label><Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-20 p-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir legenda?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente e não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
