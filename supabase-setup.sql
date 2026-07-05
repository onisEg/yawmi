-- ============================================
-- إعداد قاعدة بيانات "يومي" — الخطوة الأولى: مزامنة بكود جهاز
-- الصق ده كله في SQL Editor في Supabase واضغط Run
-- ============================================

-- جدول واحد بيخزن نسخة بيانات كل كود مزامنة
create table if not exists public.yawmi_sync (
  sync_code text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- تفعيل الحماية على مستوى الصف
alter table public.yawmi_sync enable row level security;

-- في مرحلة "كود الجهاز" (قبل الحسابات الحقيقية):
-- أي حد معاه الـ publishable key + كود المزامنة الصحيح يقدر يقرا ويكتب صفه.
-- الحماية الحقيقية هنا إن الكود نفسه سري (زي باسورد). لما نضيف الحسابات الحقيقية
-- هنشدّد السياسات دي عشان تبقى مربوطة بالمستخدم المسجّل دخوله.

-- نسمح بالقراءة والكتابة عبر الـ anon/publishable role
drop policy if exists "yawmi_sync_all" on public.yawmi_sync;
create policy "yawmi_sync_all"
  on public.yawmi_sync
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- دالة تحدّث updated_at تلقائي عند أي تعديل
create or replace function public.yawmi_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists yawmi_sync_touch on public.yawmi_sync;
create trigger yawmi_sync_touch
  before update on public.yawmi_sync
  for each row execute function public.yawmi_touch_updated_at();
