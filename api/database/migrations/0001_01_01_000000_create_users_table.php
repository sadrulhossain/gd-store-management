<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username');
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('password');
            $table->string('avatar_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('must_change_password')->default(false);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
        });

        // Case-insensitive uniqueness (soft-deleted rows keep their username/email reserved).
        DB::statement('create unique index users_username_unique on users (lower(username))');
        DB::statement('create unique index users_email_unique on users (lower(email))');
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
