<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringBill extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'space_id',
        'category_id',
        'name',
        'amount',
        'due_day', // day of month 1-31
        'frequency', // monthly, custom
        'status' // active, paused
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_day' => 'integer'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
