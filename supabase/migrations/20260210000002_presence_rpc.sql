-- ============================================================
-- RPC: increment / decrement active_conversation_count
-- Used by assign-conversation edge function
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_active_conversations(p_supporter_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.supporter_presence
  SET active_conversation_count = GREATEST(0, active_conversation_count + 1),
      updated_at = now()
  WHERE supporter_id = p_supporter_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_active_conversations(p_supporter_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.supporter_presence
  SET active_conversation_count = GREATEST(0, active_conversation_count - 1),
      updated_at = now()
  WHERE supporter_id = p_supporter_id;
END;
$$;

-- ── Trigger: auto-decrement when a conversation_assignment is resolved/transferred ──

CREATE OR REPLACE FUNCTION public.on_assignment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When an assignment transitions away from 'active', decrement the supporter's count
  IF OLD.status = 'active' AND NEW.status IN ('resolved', 'transferred') THEN
    PERFORM public.decrement_active_conversations(OLD.supporter_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assignment_status_change
  AFTER UPDATE OF status ON public.conversation_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_assignment_status_change();
