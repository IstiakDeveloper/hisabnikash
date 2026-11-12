<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Separate mobile vaults: never mutates the existing web finance tables. */
class SyncController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:1000'],
            'device_name' => ['required', 'string', 'max:80'],
        ]);
        $user = User::where('email', $input['email'])->first();
        if (! $user || ! Hash::check($input['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }
        // Never bypass an existing account's second factor with a mobile token.
        if ($user->two_factor_confirmed_at !== null) {
            throw ValidationException::withMessages(['email' => 'Mobile login for two-factor accounts requires an additional authentication flow.']);
        }

        return response()->json([
            'user_id' => (string) $user->id,
            'token' => $user->createToken($input['device_name'], ['mobile:sync'], now()->addDays(30))->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['revoked' => true]);
    }

    public function push(Request $request): JsonResponse
    {
        abort_unless($request->user()->tokenCan('mobile:sync'), 403);
        abort_if(strlen($request->getContent()) > 2 * 1024 * 1024, 413);
        $input = $request->validate([
            'operations' => ['required', 'array', 'min:1', 'max:100'],
            'operations.*.operation_id' => ['required', 'uuid', 'distinct'],
            'operations.*.id' => ['required', 'string', 'max:150', 'distinct'],
            'operations.*.kind' => ['required', Rule::in(['space', 'account', 'transaction', 'budget', 'bill', 'goal', 'loan', 'category', 'schedule', 'daily_review', 'month_close', 'party', 'invoice', 'installment', 'expectation', 'template'])],
            'operations.*.base_revision' => ['required', 'integer', 'min:0'],
            'operations.*.deleted' => ['required', 'boolean'],
            'operations.*.data' => ['required', 'array'],
        ]);
        foreach ($input['operations'] as $operation) {
            $this->validatePayload($operation['kind'], $operation['data']);
        }
        $userId = $request->user()->id;
        $results = DB::transaction(function () use ($input, $userId) {
            // Serialize each user's writes, including sequence allocation. This
            // prevents a cursor from passing a not-yet-committed older change.
            User::whereKey($userId)->lockForUpdate()->firstOrFail();
            $results = [];
            foreach ($input['operations'] as $operation) {
                $digest = hash('sha256', json_encode($operation, JSON_THROW_ON_ERROR));
                $prior = DB::table('mobile_sync_operations')->where('user_id', $userId)
                    ->where('operation_id', $operation['operation_id'])->first();
                if ($prior) {
                    if (! hash_equals($prior->digest, $digest)) {
                        throw ValidationException::withMessages(['operations' => 'Operation IDs cannot be reused for different changes.']);
                    }
                    $results[] = json_decode(Crypt::decryptString($prior->result), true, flags: JSON_THROW_ON_ERROR);

                    continue;
                }
                $existing = DB::table('mobile_sync_records')->where('user_id', $userId)
                    ->where('record_id', $operation['id'])->first();
                if ($existing && $existing->kind !== $operation['kind']) {
                    throw ValidationException::withMessages(['operations' => 'Record types cannot be changed.']);
                }
                if (! $existing && (int) $operation['base_revision'] > 0) {
                    throw ValidationException::withMessages(['operations' => 'A synced record is missing on the server. Restore server data before retrying.']);
                }
                if (($existing?->revision ?? 0) !== (int) $operation['base_revision']) {
                    $results[] = [
                        'id' => $operation['id'], 'operation_id' => $operation['operation_id'],
                        'status' => 'conflict', 'remote' => $this->record($existing),
                    ];

                    continue;
                }
                $revision = ($existing?->revision ?? 0) + 1;
                $record = ['id' => $operation['id'], 'kind' => $operation['kind'],
                    'data' => $operation['data'], 'deleted' => (bool) $operation['deleted'], 'revision' => $revision];
                DB::table('mobile_sync_records')->updateOrInsert(
                    ['user_id' => $userId, 'record_id' => $operation['id']],
                    ['kind' => $operation['kind'], 'revision' => $revision, 'deleted' => $operation['deleted'],
                        'payload' => Crypt::encryptString(json_encode($operation['data'], JSON_THROW_ON_ERROR))],
                );
                DB::table('mobile_sync_changes')->insert(['user_id' => $userId,
                    'payload' => Crypt::encryptString(json_encode($record, JSON_THROW_ON_ERROR)), 'created_at' => now()]);
                $result = ['id' => $operation['id'], 'operation_id' => $operation['operation_id'],
                    'status' => 'accepted', 'revision' => $revision];
                DB::table('mobile_sync_operations')->insert(['user_id' => $userId,
                    'operation_id' => $operation['operation_id'], 'digest' => $digest,
                    'result' => Crypt::encryptString(json_encode($result, JSON_THROW_ON_ERROR))]);
                $results[] = $result;
            }

            return $results;
        }, attempts: 3);

        return response()->json(['results' => $results]);
    }

    public function pull(Request $request): JsonResponse
    {
        abort_unless($request->user()->tokenCan('mobile:sync'), 403);
        $input = $request->validate(['cursor' => ['nullable', 'integer', 'min:0']]);
        $cursor = (int) ($input['cursor'] ?? 0);
        $rows = DB::table('mobile_sync_changes')->where('user_id', $request->user()->id)
            ->where('id', '>', $cursor)->orderBy('id')->limit(101)->get();
        $page = $rows->take(100);

        return response()->json([
            'changes' => $page->map(fn ($row) => json_decode(Crypt::decryptString($row->payload), true, flags: JSON_THROW_ON_ERROR))->values(),
            'cursor' => $page->last()?->id ?? $cursor,
            'has_more' => $rows->count() > 100,
        ]);
    }

    private function record(object $row): array
    {
        return ['id' => $row->record_id, 'kind' => $row->kind, 'revision' => (int) $row->revision,
            'deleted' => (bool) $row->deleted,
            'data' => json_decode(Crypt::decryptString($row->payload), true, flags: JSON_THROW_ON_ERROR)];
    }

    private function validatePayload(string $kind, array $data): void
    {
        $money = ['required', 'integer', 'min:1', 'max:99999999999999'];
        $name = ['required', 'string', 'max:500'];
        $rules = match ($kind) {
            'space' => ['name' => $name],
            'category' => ['name' => $name, 'type' => ['required', Rule::in(['expense', 'income'])]],
            'account' => ['name' => $name, 'opening' => ['required', 'integer', 'min:0', 'max:99999999999999']],
            'transaction' => ['amount' => $money, 'type' => ['required', Rule::in(['income', 'expense', 'transfer', 'debt_payment', 'debt_collection', 'reversal', 'refund'])],
                'account' => ['required', 'string', 'max:150'], 'date' => ['required', 'date_format:Y-m-d'],
                'category' => ['required_unless:type,transfer,reversal', 'nullable', 'string', 'max:500'],
                'originalType' => ['required_if:type,reversal', Rule::in(['income', 'expense', 'transfer', 'debt_payment', 'debt_collection', 'refund'])],
                'reversalOf' => ['required_if:type,reversal', 'string', 'max:150'],
                'destination' => ['required_if:type,transfer', 'required_if:originalType,transfer', 'nullable', 'string', 'max:150', 'different:account']],
            'budget' => ['amount' => $money, 'category' => $name, 'month' => ['required', 'date_format:Y-m']],
            'bill' => ['name' => $name, 'amount' => $money, 'due' => ['required', 'date_format:Y-m-d'],
                'frequency' => ['required', Rule::in(['once', 'monthly', 'weekly', 'yearly', 'custom'])],
                'intervalDays' => ['required_if:frequency,custom', 'nullable', 'integer', 'between:1,3650']],
            'schedule' => ['name' => $name, 'amount' => $money, 'startDate' => ['required', 'date_format:Y-m-d'],
                'anchorDay' => ['required', 'integer', 'between:1,31'], 'active' => ['required', 'boolean'], 'series' => $name],
            'goal' => ['name' => $name, 'target' => $money, 'saved' => ['required', 'integer', 'min:0', 'max:99999999999999']],
            'loan' => ['name' => $name, 'principal' => $money, 'repaid' => ['required', 'integer', 'min:0', 'lte:principal'],
                'direction' => ['required', Rule::in(['borrowed', 'lent'])]],
            'daily_review' => ['date' => ['required', 'date_format:Y-m-d'], 'fingerprint' => ['required', 'string', 'size:64'], 'noTransactions' => ['required', 'boolean']],
            'month_close' => ['month' => ['required', 'date_format:Y-m'], 'fingerprint' => ['required', 'string', 'size:64'], 'closed' => ['required', 'boolean']],
            'party' => ['name' => $name, 'type' => ['required', Rule::in(['customer', 'supplier'])], 'contact' => ['nullable', 'string', 'max:500']],
            'invoice' => ['name' => $name, 'amount' => $money, 'party' => $name, 'due' => ['required', 'date_format:Y-m-d'],
                'direction' => ['required', Rule::in(['receivable', 'payable'])], 'lines' => ['required', 'array', 'min:1', 'max:100'],
                'lines.*.name' => $name, 'lines.*.quantity' => ['required', 'integer', 'between:1,1000000'], 'lines.*.unitPrice' => $money],
            'installment' => ['loan' => $name, 'principal' => $money, 'interest' => ['required', 'integer', 'between:0,99999999999999'], 'due' => ['required', 'date_format:Y-m-d']],
            'expectation' => ['name' => $name, 'amount' => $money, 'category' => $name, 'due' => ['required', 'date_format:Y-m-d']],
            'template' => ['name' => $name, 'transaction' => ['required', 'array']],
        };
        if ($kind === 'transaction') {
            $rules += ['fee' => ['nullable', 'integer', 'between:0,99999999999999'], 'adjustment' => ['nullable', 'boolean'],
                'refundOf' => ['required_if:type,refund', 'string', 'max:150'], 'splits' => ['nullable', 'array', 'min:1', 'max:30'],
                'splits.*.category' => $name, 'splits.*.amount' => $money];
        }
        if ($kind === 'account') {
            $rules += ['lowBalance' => ['nullable', 'integer', 'between:0,99999999999999'], 'openingDate' => ['nullable', 'date_format:Y-m-d']];
        }
        if ($kind !== 'space') {
            $rules['space'] = ['required', 'string', 'max:150'];
        }
        $rules['note'] = ['nullable', 'string', 'max:500'];
        $rules['receipt'] = ['nullable', 'array'];
        $rules['receipt.bytes'] = ['required_with:receipt', 'string', 'max:700000'];
        $rules['receipt.mime'] = ['required_with:receipt', Rule::in(['image/jpeg', 'image/png'])];
        Validator::make($data, $rules)->validate();
        if ($kind === 'invoice' && array_sum(array_map(fn ($line) => $line['quantity'] * $line['unitPrice'], $data['lines'])) !== (int) $data['amount']) {
            throw ValidationException::withMessages(['lines' => 'Invoice items must match the total.']);
        }
        if ($kind === 'transaction' && isset($data['splits']) &&
            (! in_array($data['type'], ['expense', 'refund', 'reversal'], true) || array_sum(array_column($data['splits'], 'amount')) !== (int) $data['amount'])) {
            throw ValidationException::withMessages(['splits' => 'Split amounts must match an expense or refund total.']);
        }
        if ($kind === 'template') {
            if (! in_array($data['transaction']['type'] ?? null, ['income', 'expense', 'transfer'], true) || ($data['transaction']['space'] ?? null) !== $data['space']) {
                throw ValidationException::withMessages(['transaction' => 'Invalid ordinary transaction template.']);
            }
            $this->validatePayload('transaction', $data['transaction']);
        }
        if (isset($data['receipt'])) {
            $bytes = base64_decode($data['receipt']['bytes'], strict: true);
            $prefix = $data['receipt']['mime'] === 'image/png' ? "\x89PNG\r\n\x1a\n" : "\xff\xd8\xff";
            if ($bytes === false || strlen($bytes) > 512 * 1024 || ! str_starts_with($bytes, $prefix)) {
                throw ValidationException::withMessages(['receipt' => 'Invalid image attachment.']);
            }
        }
    }
}
