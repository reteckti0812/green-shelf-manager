
-- 1) Adiciona colunas de snapshot em itens_lote
ALTER TABLE public.itens_lote
  ADD COLUMN IF NOT EXISTS produto_nome text,
  ADD COLUMN IF NOT EXISTS produto_marca text,
  ADD COLUMN IF NOT EXISTS defeito_nome text,
  ADD COLUMN IF NOT EXISTS criado_por_nome text;

-- 2) Adiciona snapshot em lotes
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS operador_nome text;

-- 3) Backfill dos snapshots a partir dos dados atuais
UPDATE public.itens_lote i
SET produto_nome = p.nome,
    produto_marca = p.marca
FROM public.produtos p
WHERE i.produto_id = p.id AND i.produto_nome IS NULL;

UPDATE public.itens_lote i
SET defeito_nome = d.nome
FROM public.defeitos d
WHERE i.defeito_id = d.id AND i.defeito_nome IS NULL;

UPDATE public.itens_lote i
SET criado_por_nome = pr.nome
FROM public.profiles pr
WHERE i.criado_por = pr.user_id AND i.criado_por_nome IS NULL;

UPDATE public.lotes l
SET operador_nome = pr.nome
FROM public.profiles pr
WHERE l.operador_id = pr.user_id AND l.operador_nome IS NULL;

-- 4) Troca FKs para ON DELETE SET NULL para preservar histórico
ALTER TABLE public.itens_lote DROP CONSTRAINT IF EXISTS itens_lote_produto_id_fkey;
ALTER TABLE public.itens_lote
  ADD CONSTRAINT itens_lote_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE SET NULL;

ALTER TABLE public.itens_lote DROP CONSTRAINT IF EXISTS itens_lote_defeito_id_fkey;
ALTER TABLE public.itens_lote
  ADD CONSTRAINT itens_lote_defeito_id_fkey
  FOREIGN KEY (defeito_id) REFERENCES public.defeitos(id) ON DELETE SET NULL;

ALTER TABLE public.itens_lote DROP CONSTRAINT IF EXISTS itens_lote_criado_por_fkey;
ALTER TABLE public.itens_lote
  ADD CONSTRAINT itens_lote_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.lotes DROP CONSTRAINT IF EXISTS lotes_operador_id_fkey;
ALTER TABLE public.lotes
  ADD CONSTRAINT lotes_operador_id_fkey
  FOREIGN KEY (operador_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_usuario_id_fkey;
ALTER TABLE public.movimentacoes
  ADD CONSTRAINT movimentacoes_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5) Permite NULL nas colunas que precisam
ALTER TABLE public.itens_lote ALTER COLUMN produto_id DROP NOT NULL;
ALTER TABLE public.itens_lote ALTER COLUMN criado_por DROP NOT NULL;
ALTER TABLE public.lotes ALTER COLUMN operador_id DROP NOT NULL;
ALTER TABLE public.movimentacoes ALTER COLUMN usuario_id DROP NOT NULL;

-- 6) Trigger para preencher snapshots automaticamente em itens_lote
CREATE OR REPLACE FUNCTION public.fill_item_lote_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.produto_id IS NOT NULL AND (NEW.produto_nome IS NULL OR NEW.produto_marca IS NULL) THEN
    SELECT nome, marca INTO NEW.produto_nome, NEW.produto_marca
    FROM public.produtos WHERE id = NEW.produto_id;
  END IF;

  IF NEW.defeito_id IS NOT NULL AND NEW.defeito_nome IS NULL THEN
    SELECT nome INTO NEW.defeito_nome
    FROM public.defeitos WHERE id = NEW.defeito_id;
  END IF;

  IF NEW.criado_por IS NOT NULL AND NEW.criado_por_nome IS NULL THEN
    SELECT nome INTO NEW.criado_por_nome
    FROM public.profiles WHERE user_id = NEW.criado_por;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS itens_lote_snapshot_trigger ON public.itens_lote;
CREATE TRIGGER itens_lote_snapshot_trigger
BEFORE INSERT ON public.itens_lote
FOR EACH ROW EXECUTE FUNCTION public.fill_item_lote_snapshot();

-- 7) Trigger para preencher snapshot do operador em lotes
CREATE OR REPLACE FUNCTION public.fill_lote_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.operador_id IS NOT NULL AND NEW.operador_nome IS NULL THEN
    SELECT nome INTO NEW.operador_nome
    FROM public.profiles WHERE user_id = NEW.operador_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lotes_snapshot_trigger ON public.lotes;
CREATE TRIGGER lotes_snapshot_trigger
BEFORE INSERT ON public.lotes
FOR EACH ROW EXECUTE FUNCTION public.fill_lote_snapshot();
