-- 1) Bucket público para assets da loja (logo)
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do update set public = excluded.public;

-- 2) Políticas de leitura pública (bucket é público)
drop policy if exists "Store assets are publicly readable" on storage.objects;
create policy "Store assets are publicly readable"
on storage.objects
for select
using (bucket_id = 'store-assets');

-- 3) Escrita restrita: apenas admins autenticados e apenas na pasta do próprio CNPJ
-- Caminho esperado: {cnpj}/logo.(png|jpg|webp)

drop policy if exists "Admins can upload store assets for own cnpj" on storage.objects;
create policy "Admins can upload store assets for own cnpj"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-assets'
  and public.is_admin(auth.uid())
  and (storage.foldername(name))[1] = public.current_user_cnpj(auth.uid())
);

drop policy if exists "Admins can update store assets for own cnpj" on storage.objects;
create policy "Admins can update store assets for own cnpj"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-assets'
  and public.is_admin(auth.uid())
  and (storage.foldername(name))[1] = public.current_user_cnpj(auth.uid())
)
with check (
  bucket_id = 'store-assets'
  and public.is_admin(auth.uid())
  and (storage.foldername(name))[1] = public.current_user_cnpj(auth.uid())
);

drop policy if exists "Admins can delete store assets for own cnpj" on storage.objects;
create policy "Admins can delete store assets for own cnpj"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-assets'
  and public.is_admin(auth.uid())
  and (storage.foldername(name))[1] = public.current_user_cnpj(auth.uid())
);
