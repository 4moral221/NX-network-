-- Database Webhook / Trigger helper for Waitlist Welcome Emails
-- Fires when a new email subscriber inserts into public.waitlist

CREATE OR REPLACE FUNCTION public.trg_notify_waitlist_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the event into project audit or notification queue if queue table exists
  RAISE NOTICE 'New subscriber added to waitlist: % (%)', NEW.email, NEW.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_welcome_email ON public.waitlist;

CREATE TRIGGER trg_waitlist_welcome_email
AFTER INSERT ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_waitlist_welcome_email();

NOTIFY pgrst, 'reload schema';
