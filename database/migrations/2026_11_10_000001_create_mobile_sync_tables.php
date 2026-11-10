<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_sync_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('record_id', 150);
            $table->string('kind', 30);
            $table->unsignedInteger('revision');
            $table->boolean('deleted')->default(false);
            $table->longText('payload');
            $table->unique(['user_id', 'record_id']);
        });
        Schema::create('mobile_sync_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->longText('payload');
            $table->timestamp('created_at');
            $table->index(['user_id', 'id']);
        });
        Schema::create('mobile_sync_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('operation_id');
            $table->string('digest', 64);
            $table->text('result');
            $table->unique(['user_id', 'operation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_sync_operations');
        Schema::dropIfExists('mobile_sync_changes');
        Schema::dropIfExists('mobile_sync_records');
    }
};
