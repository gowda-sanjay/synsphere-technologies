insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'placement-images',
  'placement-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy placement_images_read_admin_or_published
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'placement-images'
  and name like 'placements/%'
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.placements as placement
      where placement.image_path = storage.objects.name
        and placement.status = 'published'
    )
  )
);

create policy placement_images_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'placement-images'
  and name like 'placements/%'
  and (select public.is_admin())
);

create policy placement_images_update_admin
on storage.objects for update to authenticated
using (
  bucket_id = 'placement-images'
  and name like 'placements/%'
  and (select public.is_admin())
)
with check (
  bucket_id = 'placement-images'
  and name like 'placements/%'
  and (select public.is_admin())
);
