-- Script para adicionar funcionalidades de administração
-- Execute este script no Supabase SQL Editor

-- Adicionar campos de admin e ban na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Criar tabela de logs de moderação
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'ban', 'unban', 'delete_post', 'create_user'
    target_user_id UUID REFERENCES auth.users(id),
    target_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de candidaturas (opcional - para rastrear candidaturas do Discord)
CREATE TABLE IF NOT EXISTS public.candidaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_username TEXT NOT NULL,
    discord_id TEXT,
    email TEXT,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'aprovada', 'rejeitada'
    notas TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

-- Políticas para moderation_logs (apenas admins podem ver/criar)
CREATE POLICY "Admins can view moderation logs" ON public.moderation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can create moderation logs" ON public.moderation_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Políticas para candidaturas (apenas admins podem gerenciar)
CREATE POLICY "Admins can view candidaturas" ON public.candidaturas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can manage candidaturas" ON public.candidaturas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Atualizar política de posts para usuários banidos não poderem postar
DROP POLICY IF EXISTS "Allow authenticated users to insert their own posts" ON public.posts;
CREATE POLICY "Allow non-banned users to insert posts" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_banned = true
        )
    );

-- Política para admins poderem deletar qualquer post
CREATE POLICY "Admins can delete any post" ON public.posts
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_admin_id ON public.moderation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON public.moderation_logs(created_at DESC);

-- IMPORTANTE: Para criar o primeiro admin, execute manualmente:
-- UPDATE public.profiles SET is_admin = true WHERE id = 'SEU_USER_ID_AQUI';
