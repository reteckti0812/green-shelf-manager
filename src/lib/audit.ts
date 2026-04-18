import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  descricao?: string;
  valor_anterior?: any;
  valor_novo?: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("auditoria").insert({
    usuario_id: user.id,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidade_id ?? null,
    descricao: params.descricao ?? null,
    valor_anterior: params.valor_anterior ?? null,
    valor_novo: params.valor_novo ?? null,
  });
}
