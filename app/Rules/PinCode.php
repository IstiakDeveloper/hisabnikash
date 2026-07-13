<?php

namespace App\Rules;

class PinCode
{
    public const PATTERN = '/^[0-9]+$/';

    /**
     * Validation rules for a 4-digit numeric PIN.
     * Uses the `password` field name for Laravel auth compatibility.
     */
    public static function rule(bool $confirmed = true): array
    {
        $rules = ['required', 'string', 'size:4', 'regex:' . self::PATTERN];

        if ($confirmed) {
            $rules[] = 'confirmed';
        }

        return $rules;
    }

    public static function messages(): array
    {
        return [
            'password.required' => 'PIN is required.',
            'password.size' => 'PIN must be exactly 4 digits.',
            'password.regex' => 'PIN must contain only numbers.',
            'password.confirmed' => 'PIN confirmation does not match.',
        ];
    }
}
