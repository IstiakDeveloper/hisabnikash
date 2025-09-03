<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'color',
        'icon',
        'monthly_limit',
        'is_default',
        'is_active'
    ];

    protected $casts = [
        'monthly_limit' => 'decimal:2',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    // Get monthly spending for this category
    public function monthlySpending($month = null, $year = null): float
    {
        $month = $month ?? now()->month;
        $year = $year ?? now()->year;

        return $this->transactions()
            ->where('type', 'expense')
            ->whereMonth('transaction_date', $month)
            ->whereYear('transaction_date', $year)
            ->sum('amount');
    }
}
