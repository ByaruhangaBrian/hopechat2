-- Allow business owners to update their business name (needed for onboarding)
-- We check if the user's business_id matches the row being updated.

CREATE POLICY "Owners can update their own business" 
ON public.businesses 
FOR UPDATE 
USING (
  id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid())
);
