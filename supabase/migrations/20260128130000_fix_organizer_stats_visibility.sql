-- ============================================================================
-- FIX: get_organizer_stats and OrganizerVisibility
-- Description: Redefines get_organizer_stats to use LEFT JOINs and UNION 
-- to ensure all organizers (even new ones without championships) are visible.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organizer_stats()
RETURNS TABLE (
    organizer_id UUID,
    organizer_email TEXT,
    organizer_name TEXT,
    total_championships BIGINT,
    total_registrations BIGINT,
    paid_payments BIGINT,
    total_revenue_cents BIGINT,
    platform_fee_cents BIGINT,
    net_revenue_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH organizer_list AS (
        -- Get all unique organizers from user_roles (global or specific)
        -- PLUS any organizer assigned in the championships table
        SELECT DISTINCT user_id 
        FROM public.user_roles 
        WHERE role = 'organizer'
        UNION
        SELECT DISTINCT o.organizer_id as user_id
        FROM public.championships o
        WHERE o.organizer_id IS NOT NULL
    ),
    stats AS (
        -- Aggregate stats per organizer by traversing championships -> registrations -> payments
        SELECT 
            c.organizer_id,
            COUNT(DISTINCT c.id) as champs_count,
            COUNT(DISTINCT r.id) as regs_count,
            COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved') as paid_count,
            COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'approved'), 0)::BIGINT as revenue,
            COALESCE(SUM(p.platform_fee_cents) FILTER (WHERE p.status = 'approved'), 0)::BIGINT as fees
        FROM public.championships c
        LEFT JOIN public.registrations r ON r.championship_id = c.id
        LEFT JOIN public.payments p ON p.registration_id = r.id
        GROUP BY c.organizer_id
    )
    SELECT 
        ol.user_id as organizer_id,
        p.email as organizer_email,
        p.full_name as organizer_name,
        COALESCE(s.champs_count, 0)::BIGINT as total_championships,
        COALESCE(s.regs_count, 0)::BIGINT as total_registrations,
        COALESCE(s.paid_count, 0)::BIGINT as paid_payments,
        COALESCE(s.revenue, 0)::BIGINT as total_revenue_cents,
        COALESCE(s.fees, 0)::BIGINT as platform_fee_cents,
        (COALESCE(s.revenue, 0) - COALESCE(s.fees, 0))::BIGINT as net_revenue_cents
    FROM organizer_list ol
    JOIN public.profiles p ON p.id = ol.user_id
    LEFT JOIN stats s ON s.organizer_id = ol.user_id;
END;
$$;

-- Grant access to authenticated users (Super Admin needs this)
GRANT EXECUTE ON FUNCTION public.get_organizer_stats() TO authenticated;
