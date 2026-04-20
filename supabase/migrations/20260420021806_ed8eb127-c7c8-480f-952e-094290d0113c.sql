-- 1) Reverte FKs de produtos e defeitos para RESTRICT (bloqueia exclusão se vinculado)
ALTER TABLE public.itens_lote DROP CONSTRAINT IF EXISTS itens_lote_produto_id_fkey;
ALTER TABLE public.itens_lote
  ADD CONSTRAINT itens_lote_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

ALTER TABLE public.itens_lote DROP CONSTRAINT IF EXISTS itens_lote_defeito_id_fkey;
ALTER TABLE public.itens_lote
  ADD CONSTRAINT itens_lote_defeito_id_fkey
  FOREIGN KEY (defeito_id) REFERENCES public.defeitos(id) ON DELETE RESTRICT;

-- 2) Adiciona campo ativo em profiles para soft delete de usuários vinculados
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;