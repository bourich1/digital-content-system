-- هذا الكود مخصص لإصلاح مشكلة 400 Bad Request
-- يرجى نسخ هذا الكود بالكامل وتشغيله في Supabase SQL Editor

-- 1. التأكد من وجود عمود partner_id وإضافة Foreign Key صحيح له
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborations' AND column_name = 'partner_id') THEN
    ALTER TABLE public.collaborations ADD COLUMN partner_id UUID;
  END IF;
END $$;

ALTER TABLE public.collaborations DROP CONSTRAINT IF EXISTS collaborations_partner_id_fkey;
ALTER TABLE public.collaborations ADD CONSTRAINT collaborations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id);


-- 2. إصلاح Foreign Key الخاص بـ user_id ليرتبط بـ profiles بدلاً من auth.users
ALTER TABLE public.collaborations DROP CONSTRAINT IF EXISTS collaborations_user_id_fkey;
ALTER TABLE public.collaborations ADD CONSTRAINT collaborations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


-- 3. تحديث ذاكرة التخزين المؤقت (Schema Cache) تلقائياً لتطبيق التغييرات
NOTIFY pgrst, 'reload schema';
