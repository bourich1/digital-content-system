-- 1. Add partner_id and partner_status to collaborations if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborations' AND column_name = 'partner_id') THEN
    ALTER TABLE public.collaborations ADD COLUMN partner_id UUID;
    ALTER TABLE public.collaborations ADD CONSTRAINT collaborations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborations' AND column_name = 'partner_status') THEN
    ALTER TABLE public.collaborations ADD COLUMN partner_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- 1.5 Ensure the user_id foreign key is named exactly what we expect for PostgREST
ALTER TABLE public.collaborations DROP CONSTRAINT IF EXISTS collaborations_user_id_fkey;
ALTER TABLE public.collaborations ADD CONSTRAINT collaborations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Create a secure function to search for users by username
CREATE OR REPLACE FUNCTION search_users_by_username(search_query TEXT)
RETURNS TABLE(id UUID, username TEXT, full_name TEXT, avatar_url TEXT)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.username ILIKE '%' || search_query || '%'
  LIMIT 5;
END;
$$;

-- 3. Update RLS policy so partners can also see and edit the collaboration
DROP POLICY IF EXISTS "Users can manage their own collaborations" ON public.collaborations;
CREATE POLICY "Users can manage their own collaborations" ON public.collaborations
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = partner_id OR is_admin());

DROP POLICY IF EXISTS "Users can manage their own collaboration images" ON public.collaboration_images;
CREATE POLICY "Users can manage their own collaboration images" ON public.collaboration_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.collaborations
      WHERE id = collaboration_id AND (user_id = auth.uid() OR partner_id = auth.uid() OR is_admin())
    )
  );

-- 4. Create trigger to send notification on new collaboration request
CREATE OR REPLACE FUNCTION notify_on_collaboration_request()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sender_username TEXT;
BEGIN
  IF NEW.partner_id IS NOT NULL THEN
    SELECT username INTO v_sender_username FROM public.profiles WHERE id = NEW.user_id;
    
    INSERT INTO public.in_app_notifications (user_id, title, message)
    VALUES (
      NEW.partner_id,
      'New Collaboration Request',
      '@' || COALESCE(v_sender_username, 'Someone') || ' wants to collaborate with you!'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_collaboration_request ON public.collaborations;
CREATE TRIGGER on_collaboration_request
  AFTER INSERT ON public.collaborations
  FOR EACH ROW EXECUTE PROCEDURE notify_on_collaboration_request();

-- 5. Create secure function to respond to a collaboration (Accept/Decline)
CREATE OR REPLACE FUNCTION respond_to_collaboration(collab_id UUID, response_status TEXT)
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_collab RECORD;
  v_partner_username TEXT;
BEGIN
  -- Get the collaboration
  SELECT * INTO v_collab FROM public.collaborations WHERE id = collab_id;
  
  IF v_collab IS NULL THEN
    RAISE EXCEPTION 'Collaboration not found';
  END IF;

  -- Ensure the caller is the partner
  IF v_collab.partner_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Get partner username
  SELECT username INTO v_partner_username FROM public.profiles WHERE id = v_collab.partner_id;

  IF response_status = 'accepted' THEN
    UPDATE public.collaborations SET partner_status = 'accepted' WHERE id = collab_id;
    
    INSERT INTO public.in_app_notifications (user_id, title, message)
    VALUES (
      v_collab.user_id, 
      'Collaboration Accepted', 
      '@' || COALESCE(v_partner_username, 'Someone') || ' accepted your collaboration request!'
    );
    
  ELSIF response_status = 'declined' THEN
    DELETE FROM public.collaborations WHERE id = collab_id;
    
    INSERT INTO public.in_app_notifications (user_id, title, message)
    VALUES (
      v_collab.user_id, 
      'Collaboration Declined', 
      '@' || COALESCE(v_partner_username, 'Someone') || ' declined your collaboration request.'
    );
  END IF;
END;
$$;

-- 6. Enable Realtime for Notifications so the Bell works instantly!
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'in_app_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
  END IF;
END $$;

-- 7. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
