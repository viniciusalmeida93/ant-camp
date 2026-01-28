import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { parseCurrencyToCents } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    valueCents: number;
    onChange: (cents: number) => void;
    label?: string;
}

export function CurrencyInput({ valueCents, onChange, ...props }: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
        // Update display value when external valueCents changes
        const reais = valueCents / 100;
        setDisplayValue(reais.toFixed(2).replace(".", ","));
    }, [valueCents]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow only numbers, comma and dot
        const sanitized = val.replace(/[^0-9,.]/g, "");
        setDisplayValue(sanitized);

        const cents = parseCurrencyToCents(sanitized);
        onChange(cents);
    };

    const handleBlur = () => {
        const reais = valueCents / 100;
        setDisplayValue(reais.toFixed(2).replace(".", ","));
    };

    return (
        <Input
            {...props}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
}
