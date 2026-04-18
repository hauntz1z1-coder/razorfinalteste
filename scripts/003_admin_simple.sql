-- Execute este script no SQL Editor do Supabase Dashboard
-- Adiciona campos de admin e ban na tabela profiles

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES auth.users(id);

-- Tabela de candidaturas (pessoas que querem criar conta)
CREATE TABLE IF NOT EXISTS public.candidaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username TEXT NOT NULL,
  discord_id TEXT,
  nome TEXT NOT NULL,
  idade INTEGER,
  jogos_principais TEXT,
  experiencia TEXT,
  porque_entrar TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de moderação
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_post_id UUID REFERENCES public.posts(id),
  target_candidatura_id UUID REFERENCES public.candidaturas(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para candidaturas
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode enviar candidatura
CREATE POLICY "anyone_can_apply" ON public.candidaturas
  FOR INSERT WITH CHECK (true);

-- Apenas admins podem ver candidaturas
CREATE POLICY "admins_view_applications" ON public.candidaturas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Apenas admins podem atualizar candidaturas
CREATE POLICY "admins_update_applications" ON public.candidaturas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- RLS para logs de moderação
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e inserir logs
CREATE POLICY "admins_manage_logs" ON public.moderation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Para definir o primeiro admin, execute:
-- UPDATE public.profiles SET is_admin = true WHERE id = 'SEU_USER_ID_AQUI';
