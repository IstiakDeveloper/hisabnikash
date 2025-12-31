<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('name'); // e.g., "Monthly Food Budget", "Development Budget"
            $table->decimal('amount', 15, 2); // Budget amount
            $table->enum('period', ['daily', 'weekly', 'monthly', 'yearly'])->default('monthly');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('spent_amount', 15, 2)->default(0); // Track spent amount
            $table->text('note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('notify_on_exceed')->default(true); // Alert when budget exceeded
            $table->integer('alert_percentage')->default(80); // Alert at 80% of budget
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index(['user_id', 'start_date', 'end_date']);
            $table->index(['category_id', 'start_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
