export interface Coupon {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    championship_id: string;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CouponFormData {
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    expires_at: string;
    is_active: boolean;
}
