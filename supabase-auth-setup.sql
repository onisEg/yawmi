-- ============================================
-- إعداد الحسابات — الخطوة الثانية
-- الصق ده في SQL Editor واضغط Run
-- ============================================

-- جدول بيانات المستخدمين: صف واحد لكل مستخدم مربوط بحسابه
create table if not exists public.yawmi_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.yawmi_data enable row level security;

-- كل مستخدم يقدر يشوف ويعدّل صفه هو بس — مربوط بهويته من نظام الحسابات
drop policy if exists "yawmi_data_select" on public.yawmi_data;
create policy "yawmi_data_select" on public.yawmi_data
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "yawmi_data_insert" on public.yawmi_data;
create policy "yawmi_data_insert" on public.yawmi_data
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "yawmi_data_update" on public.yawmi_data;
create policy "yawmi_data_update" on public.yawmi_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- تحديث updated_at تلقائي
create or replace function public.yawmi_touch()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists yawmi_data_touch on public.yawmi_data;
create trigger yawmi_data_touch
  before update on public.yawmi_data
  for each row execute function public.yawmi_touch();

-- ملاحظة: جدول yawmi_sync القديم (كود الجهاز) نقدر نسيبه أو نمسحه لاحقاً.
