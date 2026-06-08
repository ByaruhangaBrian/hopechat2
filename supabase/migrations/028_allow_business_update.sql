-- Allow business owners to update their business name (needed for onboarding)
-- We check if the user is an 'owner' in the business they are trying to update.

CREATE POLICY "Owners can update their own business" 
ON public.businesses 
FOR UPDATE 
USING (
  id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'owner')
)
WITH CHECK (
  id = (SELECT business_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'owner')
);
