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
        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['taken', 'given']); // taken = ami loan niyechi, given = ami loan diyechi
            $table->string('person_name');
            $table->string('person_phone')->nullable();
            $table->decimal('amount', 15, 2); // Original loan amount
            $table->decimal('remaining_amount', 15, 2); // Baki amount
            $table->date('loan_date');
            $table->date('due_date')->nullable();
            $table->text('note')->nullable();
            $table->decimal('interest_rate', 5, 2)->default(0); // Interest rate if any
            $table->boolean('is_completed')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'is_completed']);
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loans');
    }
};
