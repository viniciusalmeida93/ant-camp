-- Create championships table with pricing
CREATE TABLE IF NOT EXISTS public.championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  is_indexable BOOLEAN DEFAULT true,
  pin_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create categories table with pricing
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('individual', 'dupla', 'trio', 'time')),
  gender TEXT NOT NULL CHECK (gender IN ('masculino', 'feminino', 'misto')),
  capacity INTEGER NOT NULL DEFAULT 50,
  team_size INTEGER,
  rules TEXT,
  gender_composition TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create registrations table with payment integration
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  athlete_email TEXT NOT NULL,
  athlete_phone TEXT,
  team_name TEXT,
  team_members JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'expired')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'cancelled', 'refunded', 'expired')),
  payment_id TEXT,
  subtotal_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table for audit trail
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  asaas_payment_id TEXT UNIQUE,
  asaas_customer_id TEXT,
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'cancelled', 'refunded')),
  payment_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  boleto_url TEXT,
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  athlete_email TEXT NOT NULL,
  athlete_phone TEXT,
  position INTEGER NOT NULL,
  notified_at TIMESTAMPTZ,
  payment_link_sent_at TIMESTAMPTZ,
  payment_link_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for championships
CREATE POLICY "Championships are viewable by everyone"
  ON public.championships FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage their championships"
  ON public.championships FOR ALL
  USING (auth.uid() = organizer_id);

-- RLS Policies for categories
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE id = categories.championship_id
      AND organizer_id = auth.uid()
    )
  );

-- RLS Policies for registrations
CREATE POLICY "Registrations are viewable by organizers"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE id = registrations.championship_id
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create registrations"
  ON public.registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Organizers can update registrations"
  ON public.registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE id = registrations.championship_id
      AND organizer_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Payments are viewable by organizers"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.championships c ON c.id = r.championship_id
      WHERE r.id = payments.registration_id
      AND c.organizer_id = auth.uid()
    )
  );

CREATE POLICY "System can manage payments"
  ON public.payments FOR ALL
  USING (true);

-- RLS Policies for waitlist
CREATE POLICY "Waitlist is viewable by organizers"
  ON public.waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.championships
      WHERE id = waitlist.championship_id
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_championships_updated_at
  BEFORE UPDATE ON public.championships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_championships_slug ON public.championships(slug);
CREATE INDEX idx_championships_organizer ON public.championships(organizer_id);
CREATE INDEX idx_categories_championship ON public.categories(championship_id);
CREATE INDEX idx_registrations_championship ON public.registrations(championship_id);
CREATE INDEX idx_registrations_category ON public.registrations(category_id);
CREATE INDEX idx_registrations_status ON public.registrations(payment_status);
CREATE INDEX idx_payments_registration ON public.payments(registration_id);
CREATE INDEX idx_payments_asaas_id ON public.payments(asaas_payment_id);
CREATE INDEX idx_waitlist_category ON public.waitlist(category_id);