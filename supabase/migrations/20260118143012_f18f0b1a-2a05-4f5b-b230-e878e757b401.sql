-- When a medical consultation is finalized, automatically finalize the linked appointment.

CREATE OR REPLACE FUNCTION public.handle_medical_consultation_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act on the transition from active -> ended
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at <> NEW.ended_at) THEN
    IF NEW.appointment_id IS NOT NULL THEN
      UPDATE public.appointments
      SET status = 'finalizado'::public.appointment_status,
          updated_at = now()
      WHERE id = NEW.appointment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_consultation_finalized ON public.medical_consultations;
CREATE TRIGGER trg_medical_consultation_finalized
AFTER UPDATE OF ended_at ON public.medical_consultations
FOR EACH ROW
EXECUTE FUNCTION public.handle_medical_consultation_finalized();
