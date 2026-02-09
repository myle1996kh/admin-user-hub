
-- Add assigned supporter to conversations
ALTER TABLE public.conversations ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- RLS policy: org members can view profiles of other org members (needed for assignment dropdown)
CREATE POLICY "Org members can view fellow members profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships om1
    JOIN public.organization_memberships om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
  )
);
