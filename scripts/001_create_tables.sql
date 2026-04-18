-- Criar tabela de perfis (conecta com o Auth do Supabase)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  bio text,
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS para profiles
alter table public.profiles enable row level security;

-- Policies para profiles
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Criar tabela de posts
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text,
  media_url text,
  tag text check (tag in ('clutch', 'win', 'highlight')),
  created_at timestamp with time zone default now()
);

-- Habilitar RLS para posts
alter table public.posts enable row level security;

-- Policies para posts
create policy "Posts are viewable by everyone" on public.posts
  for select using (true);

create policy "Users can insert their own posts" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own posts" on public.posts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own posts" on public.posts
  for delete using (auth.uid() = user_id);

-- Criar tabela de likes
create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

-- Habilitar RLS para likes
alter table public.likes enable row level security;

-- Policies para likes
create policy "Likes are viewable by everyone" on public.likes
  for select using (true);

create policy "Users can insert their own likes" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own likes" on public.likes
  for delete using (auth.uid() = user_id);

-- Habilitar Realtime para ver as atualizações ao vivo
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table likes;
