-- Allow users to view payments related to their registrations
CREATE POLICY "Users can view payments for their own registrations"
ON public.payments
FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.registrations
    where registrations.id = payments.registration_id
    and registrations.user_id = auth.uid()
  )
);

-- Also allow public access if the registration is linked to public?
-- Actually, the payment fetch in Checkout.tsx uses registration.payment_id.
-- If the user is ANONYMOUS (public registration), we might need a different policy.
-- But Checkout.tsx is likely used by logged in users in Dashboard.
-- If used by public (right after registration), we need to ensure they can see it.
-- But usually 406 happens for authenticated users if policy is missing.

-- Let's also add a policy for service_role to do anything (default usually, but good to ensure).
