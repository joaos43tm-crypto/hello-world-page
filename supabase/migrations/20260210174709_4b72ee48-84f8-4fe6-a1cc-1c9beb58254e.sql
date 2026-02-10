-- Block retroactive appointments via trigger (keeps existing historical rows intact)

CREATE OR REPLACE FUNCTION public.prevent_past_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_new_date date;
BEGIN
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_new_date := NEW.scheduled_date::date;

  IF v_new_date < v_today THEN
    RAISE EXCEPTION 'Não é permitido agendar em datas anteriores (data=%).', NEW.scheduled_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_past_appointments ON public.appointments;

CREATE TRIGGER trg_prevent_past_appointments
BEFORE INSERT OR UPDATE OF scheduled_date ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_past_appointments();
