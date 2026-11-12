<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('professional planning records and split refunds round trip through sync', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    $payloads = [
        'daily_review' => ['date' => '2026-11-12', 'fingerprint' => str_repeat('a', 64), 'noTransactions' => false],
        'month_close' => ['month' => '2026-10', 'fingerprint' => str_repeat('b', 64), 'closed' => true],
        'party' => ['name' => 'Customer', 'type' => 'customer'],
        'invoice' => ['name' => 'INV-1', 'party' => 'customer', 'amount' => 10000, 'direction' => 'receivable', 'due' => '2026-11-15',
            'lines' => [['name' => 'Design', 'quantity' => 2, 'unitPrice' => 5000]]],
        'installment' => ['loan' => 'loan', 'principal' => 10000, 'interest' => 100, 'due' => '2026-11-15'],
        'expectation' => ['name' => 'Salary', 'amount' => 10000, 'category' => 'Salary', 'due' => '2026-11-30'],
        'template' => ['name' => 'Lunch', 'transaction' => ['space' => 'personal', 'type' => 'expense', 'amount' => 1000, 'account' => 'cash', 'category' => 'Food', 'date' => '2026-11-12']],
        'transaction' => ['type' => 'refund', 'amount' => 1000, 'refundOf' => 'expense', 'account' => 'cash', 'category' => 'Food',
            'date' => '2026-11-12', 'fee' => 0, 'splits' => [['category' => 'Food', 'amount' => 1000]]],
    ];
    $operations = [];
    foreach ($payloads as $kind => $data) {
        $operations[] = mobileOperation(['kind' => $kind, 'data' => ['space' => 'personal', ...$data]]);
    }
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => $operations])->assertOk()->assertJsonCount(8, 'results');
    $this->getJson('/api/mobile/v1/sync/pull')->assertOk()->assertJsonCount(8, 'changes');
});

test('sync rejects inconsistent invoice and split totals', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    foreach ([
        ['kind' => 'invoice', 'data' => ['space' => 'personal', 'name' => 'INV-1', 'party' => 'customer', 'amount' => 200,
            'direction' => 'payable', 'due' => '2026-11-15', 'lines' => [['name' => 'Item', 'quantity' => 1, 'unitPrice' => 100]]]],
        ['kind' => 'transaction', 'data' => ['space' => 'personal', 'type' => 'expense', 'amount' => 200, 'account' => 'cash',
            'category' => 'Food', 'date' => '2026-11-12', 'splits' => [['category' => 'Food', 'amount' => 100]]]],
    ] as $invalid) {
        $this->postJson('/api/mobile/v1/sync/push', ['operations' => [mobileOperation($invalid)]])->assertUnprocessable();
    }
    expect(DB::table('mobile_sync_records')->count())->toBe(0);
});

function mobileOperation(array $overrides = []): array
{
    return array_replace(['operation_id' => (string) Str::uuid(), 'id' => (string) Str::uuid(),
        'kind' => 'space', 'base_revision' => 0, 'deleted' => false,
        'data' => ['name' => 'Private personal space']], $overrides);
}

test('mobile sync requires authentication', function () {
    $this->getJson('/api/mobile/v1/sync/pull')->assertUnauthorized();
});

test('mobile tokens are restricted to their sync ability', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['other']);
    $this->getJson('/api/mobile/v1/sync/pull')->assertForbidden();
});

test('replayed operations are idempotent and encrypted at rest', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    $operation = mobileOperation();
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])
        ->assertOk()->assertJsonPath('results.0.revision', 1);
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])
        ->assertOk()->assertJsonPath('results.0.revision', 1);
    expect(DB::table('mobile_sync_changes')->count())->toBe(1);
    expect(DB::table('mobile_sync_records')->first()->payload)->not->toContain('Private personal space');
    $this->getJson('/api/mobile/v1/sync/pull?cursor=0')->assertOk()
        ->assertJsonPath('changes.0.data.name', 'Private personal space');
});

test('reusing an operation id with different data is rejected', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    $operation = mobileOperation();
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])->assertOk();
    $operation['data']['name'] = 'Changed';
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])->assertUnprocessable();
});

test('stale edits return both versions without overwriting', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    $operation = mobileOperation();
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])->assertOk();
    $stale = mobileOperation(['id' => $operation['id'], 'data' => ['name' => 'Stale edit']]);
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$stale]])
        ->assertOk()->assertJsonPath('results.0.status', 'conflict')
        ->assertJsonPath('results.0.remote.data.name', 'Private personal space');
    expect(DB::table('mobile_sync_changes')->count())->toBe(1);
});

test('users cannot pull or overwrite each others records', function () {
    $first = User::factory()->create(['username' => 'mobile_'.Str::random(12)]);
    $second = User::factory()->create(['username' => 'mobile_'.Str::random(12)]);
    $operation = mobileOperation();
    Sanctum::actingAs($first, ['mobile:sync']);
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])->assertOk();
    Sanctum::actingAs($second, ['mobile:sync']);
    $this->getJson('/api/mobile/v1/sync/pull')->assertOk()->assertJsonCount(0, 'changes');
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [mobileOperation(['id' => $operation['id']])]])->assertOk();
    expect(DB::table('mobile_sync_records')->count())->toBe(2);
});

test('deletions are delivered as tombstones to other devices', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    $operation = mobileOperation();
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$operation]])->assertOk();
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [mobileOperation([
        'id' => $operation['id'], 'base_revision' => 1, 'deleted' => true,
    ])]])->assertOk()->assertJsonPath('results.0.revision', 2);
    $this->getJson('/api/mobile/v1/sync/pull')->assertOk()->assertJsonPath('changes.1.deleted', true);
});

test('mobile login rejects wrong passwords and does not bypass two factor', function () {
    $user = User::factory()->create(['username' => 'mobile_'.Str::random(12)]);
    $this->postJson('/api/mobile/v1/login', ['email' => $user->email, 'password' => 'wrong', 'device_name' => 'Test'])->assertUnprocessable();
    $user->forceFill(['two_factor_confirmed_at' => now()])->save();
    $this->postJson('/api/mobile/v1/login', ['email' => $user->email, 'password' => 'password', 'device_name' => 'Test'])->assertUnprocessable();
});

test('bill schedule controllers and correction entries round trip through sync', function () {
    Sanctum::actingAs(User::factory()->create(['username' => 'mobile_'.Str::random(12)]), ['mobile:sync']);
    $schedule = mobileOperation(['kind' => 'schedule', 'data' => ['space' => 'personal', 'name' => 'Rent',
        'amount' => 50000, 'startDate' => '2026-11-30', 'anchorDay' => 31, 'active' => true, 'series' => 'rent-series']]);
    $reversal = mobileOperation(['kind' => 'transaction', 'data' => ['space' => 'personal', 'type' => 'reversal',
        'originalType' => 'transfer', 'reversalOf' => 'original-transfer', 'account' => 'cash', 'destination' => 'bank',
        'date' => '2026-11-11', 'amount' => 1234, 'category' => '']]);
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$schedule, $reversal]])->assertOk();
    $this->getJson('/api/mobile/v1/sync/pull')->assertOk()->assertJsonPath('changes.0.data.anchorDay', 31)
        ->assertJsonPath('changes.1.data.reversalOf', 'original-transfer');
    $invalid = mobileOperation(['kind' => 'transaction', 'data' => ['space' => 'personal', 'type' => 'reversal',
        'account' => 'cash', 'date' => '2026-11-11', 'amount' => 1234]]);
    $this->postJson('/api/mobile/v1/sync/push', ['operations' => [$invalid]])->assertUnprocessable();
});
