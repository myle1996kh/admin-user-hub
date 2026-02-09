
-- Fix the permissive INSERT policy on organizations to be more explicit
DROP POLICY "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);
