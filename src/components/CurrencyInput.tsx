import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    valueCents: number;
    onChange: (cents: number) => void;
}

export function CurrencyInput({ valueCents, onChange, ...props }: CurrencyInputProps) {
    // Local state for the typed string to avoid cursor jumping and race conditions
    const [inputValue, setInputValue] = useState("");

    // Format cents to BRL string (e.g., 170 -> "1,70")
    const formatCents = (cents: number) => {
        const reais = cents / 100;
        return reais.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    // Initialize/Sync input value from external valueCents
    useEffect(() => {
        setInputValue(formatCents(valueCents));
    }, [valueCents]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Get only digits
        const digits = e.target.value.replace(/\D/g, "");

        // Convert digits back to cents (max 12 digits to avoid overflow)
        const cents = parseInt(digits.slice(0, 12)) || 0;

        // Notify parent of the numeric change
        onChange(cents);

        // Local mask update
        setInputValue(formatCents(cents));
    };

    return (
        <Input
            {...props}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleChange}
        />
    );
}
