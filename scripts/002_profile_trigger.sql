-- Trigger para criar perfil automaticamente quando um usuário se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null),
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Remover trigger existente se houver
drop trigger if exists on_auth_user_created on auth.users;

-- Criar trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
