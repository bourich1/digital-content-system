CREATE OR REPLACE FUNCTION auto_reply_support_message()
RETURNS trigger AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Check if the sender is a normal user
  IF NEW.sender_id = NEW.user_id THEN
    -- Get the first available admin ID
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    IF v_admin_id IS NOT NULL THEN
      -- Check if there's already an auto-reply in the last 1 hour
      IF NOT EXISTS (
        SELECT 1 FROM public.support_messages
        WHERE user_id = NEW.user_id 
          AND sender_id = v_admin_id
          AND content LIKE 'Thank you for reaching out!%'
          AND created_at > now() - interval '1 hour'
      ) THEN
        -- Insert auto reply
        INSERT INTO public.support_messages (user_id, sender_id, content, is_read)
        VALUES (
            NEW.user_id, 
            v_admin_id, 
            'Thank you for reaching out! Support has received your message. We are reviewing it and will get back to you shortly.' || chr(10) || chr(10) || 'شكراً لتواصلك معنا! لقد تلقى فريق الدعم رسالتك، نحن نقوم بمراجعتها وسنرد عليك قريباً.', 
            false
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_message ON public.support_messages;
CREATE TRIGGER on_user_message
    AFTER INSERT ON public.support_messages
    FOR EACH ROW EXECUTE FUNCTION auto_reply_support_message();
