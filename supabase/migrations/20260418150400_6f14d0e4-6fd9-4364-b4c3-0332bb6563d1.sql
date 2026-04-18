-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');
CREATE TYPE public.lote_status AS ENUM ('em_andamento', 'pausado', 'finalizado', 'sem_localizacao', 'expedido');
CREATE TYPE public.movimentacao_tipo AS ENUM ('alocacao', 'transferencia', 'saida', 'reabertura');

-- ============ FUNÇÃO updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ TRIGGER: novo usuário -> profile ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, cargo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'cargo', 'Operador')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'operador'::public.app_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PROFILES POLICIES ============
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ USER ROLES POLICIES ============
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PRODUTOS ============
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Authenticated read produtos" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage produtos" ON public.produtos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ DEFEITOS ============
CREATE TABLE public.defeitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.defeitos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_defeitos_updated BEFORE UPDATE ON public.defeitos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Authenticated read defeitos" ON public.defeitos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage defeitos" ON public.defeitos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ LEGENDAS ============
CREATE TABLE public.legendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#10b981',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.legendas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_legendas_updated BEFORE UPDATE ON public.legendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Authenticated read legendas" ON public.legendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage legendas" ON public.legendas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ LOCALIZACOES ============
CREATE TABLE public.localizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  rua INT NOT NULL,
  coluna INT NOT NULL,
  nivel INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rua, coluna, nivel)
);
ALTER TABLE public.localizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read localizacoes" ON public.localizacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage localizacoes" ON public.localizacoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Popular localizacoes: 12 ruas x 7 níveis, profundidades variadas
DO $$
DECLARE
  r INT; c INT; n INT; profundidade INT;
BEGIN
  FOR r IN 1..12 LOOP
    IF r <= 3 THEN profundidade := 10;
    ELSIF r <= 7 THEN profundidade := 8;
    ELSE profundidade := 18;
    END IF;
    FOR c IN 1..profundidade LOOP
      FOR n IN 1..7 LOOP
        INSERT INTO public.localizacoes (codigo, rua, coluna, nivel)
        VALUES ('E-' || r || '-' || c || '-' || n, r, c, n);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============ LOTES ============
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  b2b BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  status public.lote_status NOT NULL DEFAULT 'em_andamento',
  operador_id UUID NOT NULL REFERENCES auth.users(id),
  localizacao_id UUID REFERENCES public.localizacoes(id),
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  pausado_em TIMESTAMPTZ,
  retomado_em TIMESTAMPTZ,
  finalizado_em TIMESTAMPTZ,
  expedido_em TIMESTAMPTZ,
  pausa_acumulada_seg INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_lotes_updated BEFORE UPDATE ON public.lotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_lotes_status ON public.lotes(status);
CREATE INDEX idx_lotes_operador ON public.lotes(operador_id);
CREATE INDEX idx_lotes_localizacao ON public.lotes(localizacao_id);

CREATE POLICY "Authenticated read lotes" ON public.lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador insert own lote" ON public.lotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = operador_id);
CREATE POLICY "Operador update own lote" ON public.lotes FOR UPDATE TO authenticated USING (auth.uid() = operador_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete lote" ON public.lotes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ ITENS DO LOTE ============
CREATE TABLE public.itens_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  defeito_id UUID REFERENCES public.defeitos(id),
  observacao TEXT,
  ordem INT NOT NULL,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.itens_lote ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_itens_updated BEFORE UPDATE ON public.itens_lote FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_itens_lote ON public.itens_lote(lote_id);

CREATE POLICY "Authenticated read itens" ON public.itens_lote FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador insert item" ON public.itens_lote FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "Operador update item" ON public.itens_lote FOR UPDATE TO authenticated USING (auth.uid() = criado_por OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operador delete item" ON public.itens_lote FOR DELETE TO authenticated USING (auth.uid() = criado_por OR public.has_role(auth.uid(), 'admin'));

-- ============ MOVIMENTACOES ============
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  tipo public.movimentacao_tipo NOT NULL,
  localizacao_origem_id UUID REFERENCES public.localizacoes(id),
  localizacao_destino_id UUID REFERENCES public.localizacoes(id),
  observacao TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mov_lote ON public.movimentacoes(lote_id);
CREATE POLICY "Authenticated read mov" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert mov" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  descricao TEXT,
  valor_anterior JSONB,
  valor_novo JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_auditoria_data ON public.auditoria(created_at DESC);
CREATE INDEX idx_auditoria_usuario ON public.auditoria(usuario_id);
CREATE POLICY "Admin read auditoria" ON public.auditoria FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated insert auditoria" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- ============ SEEDS ============
INSERT INTO public.legendas (sigla, descricao, cor) VALUES
  ('LI', 'Liberado', '#10b981'),
  ('NI', 'Não identificado', '#f59e0b'),
  ('IQ', 'Inspeção de qualidade', '#3b82f6'),
  ('AV', 'Avariado', '#ef4444');

INSERT INTO public.produtos (nome, marca) VALUES
  ('Produto Exemplo A', 'Marca X'),
  ('Produto Exemplo B', 'Marca Y'),
  ('Produto Exemplo C', 'Marca Z');

INSERT INTO public.defeitos (nome, descricao) VALUES
  ('Embalagem danificada', 'Caixa amassada ou rasgada'),
  ('Produto quebrado', 'Item com avaria visível'),
  ('Sem defeito', 'Item em perfeito estado'),
  ('Etiqueta danificada', 'Etiqueta ilegível ou rasgada');