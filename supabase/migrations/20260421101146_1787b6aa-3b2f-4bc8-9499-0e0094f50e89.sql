ALTER TABLE public.auditoria DROP CONSTRAINT IF EXISTS auditoria_usuario_id_fkey;
ALTER TABLE public.auditoria
  ADD CONSTRAINT auditoria_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;