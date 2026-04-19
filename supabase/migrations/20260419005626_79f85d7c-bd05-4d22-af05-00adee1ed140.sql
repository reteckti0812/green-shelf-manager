
-- Realtime: payload completo
ALTER TABLE public.lotes REPLICA IDENTITY FULL;
ALTER TABLE public.itens_lote REPLICA IDENTITY FULL;
ALTER TABLE public.movimentacoes REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adiciona à publicação (ignora se já estiver)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_lote; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Permite admin deletar produtos/defeitos/legendas (já existe policy ALL via has_role admin, mas garantimos DELETE explícito)
-- (As policies "Admins manage X" com command ALL já cobrem DELETE)
