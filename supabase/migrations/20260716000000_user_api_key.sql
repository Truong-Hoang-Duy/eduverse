-- API key Gemini riêng của từng người dùng.
--
-- KHÔNG để cột này trong `profiles`: RLS của Postgres là theo DÒNG, không theo
-- CỘT — mà `profiles_select` cho giáo viên đọc profile học viên và bạn cùng lớp
-- đọc profile của nhau, nên để key ở đó là lộ. Tách bảng riêng, chỉ chủ sở hữu
-- đọc/ghi được.

create table public.user_secrets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  gemini_api_key text,
  updated_at timestamptz not null default now()
);

alter table public.user_secrets enable row level security;

-- Chỉ chính chủ. Không có policy nào cho người khác — kể cả giáo viên.
create policy "user_secrets_own" on public.user_secrets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
