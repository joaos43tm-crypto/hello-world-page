-- When a medical consultation is started (inserted), automatically set the linked appointment to 'em_atendimento'.

CREATE OR REPLACE FUNCTION public.handle_medical_consultation_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET status = 'em_atendimento'::public.appointment_status,
        updated_at = now()
    WHERE id = NEW.appointment_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_consultation_started ON public.medical_consultations;
CREATE TRIGGER trg_medical_consultation_started
AFTER INSERT ON public.medical_consultations
FOR EACH ROW
EXECUTE FUNCTION public.handle_medical_consultation_started();
