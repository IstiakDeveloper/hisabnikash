<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Space;
use App\Models\User;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Models\SavingsGoal;
use App\Models\RecurringBill;
use App\Models\Note;
use App\Models\Notification;
use App\Models\LoginActivity;
use App\Services\FinanceBackupService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        
        $categories = Category::where('user_id', $user->id)
            ->with('space')
            ->orderBy('type')
            ->get();
            
        $spaces = Space::where('user_id', $user->id)->get();
        
        $loginLogs = LoginActivity::where('user_id', $user->id)
            ->orderBy('logged_in_at', 'desc')
            ->take(10)
            ->get();

        return Inertia::render('Settings/Index', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'currency' => $user->currency,
                'timezone' => $user->timezone,
                'auto_logout_minutes' => $user->auto_logout_minutes,
                'language' => $user->language ?? 'en',
                'has_pin' => !empty($user->pin_code),
                'has_biometric' => !empty($user->biometric_credential_id),
                'two_factor_enabled' => !empty($user->two_factor_confirmed_at),
            ],
            'categories' => $categories,
            'spaces' => $spaces,
            'loginLogs' => $loginLogs,
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'currency' => 'required|string|max:10',
            'timezone' => 'required|string|max:100',
            'language' => 'required|string|in:en,bn',
        ]);

        $user->update($validated);
        
        $msg = $validated['language'] === 'bn' 
            ? 'প্রোফাইল সেটিংস সফলভাবে আপডেট হয়েছে।' 
            : 'Profile settings updated successfully.';

        return redirect()->back()->with('success', $msg);
    }

    public function updateLanguage(Request $request): RedirectResponse
    {
        $request->validate([
            'language' => 'required|string|in:en,bn',
        ]);

        $locale = $request->language;
        session(['locale' => $locale]);

        if (auth()->check()) {
            auth()->user()->update(['language' => $locale]);
        }

        $msg = $locale === 'bn' 
            ? 'ভাষা সফলভাবে পরিবর্তন করা হয়েছে।' 
            : 'Language changed successfully.';

        return redirect()->back()->with('success', $msg);
    }

    public function setPin(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $validated = $request->validate([
            'pin_code' => 'nullable|string|size:4|regex:/^[0-9]+$/',
        ]);

        $user->update([
            'pin_code' => $validated['pin_code'] // Nullable to remove pin lock
        ]);

        $msg = $validated['pin_code'] ? 'পিন লক সফলভাবে চালু করা হয়েছে।' : 'পিন লক সফলভাবে নিষ্ক্রিয় করা হয়েছে।';
        return redirect()->back()->with('success', $msg);
    }

    public function verifyPin(Request $request)
    {
        $user = auth()->user();
        $request->validate([
            'pin_code' => 'required|string|size:4',
        ]);

        if ($user->pin_code === $request->pin_code) {
            session(['pin_verified_at' => now()]);
            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false, 'message' => 'ভুল পিন কোড!'], 422);
    }

    /**
     * Download a full database backup in JSON format for the current user.
     */
    public function backupJson(FinanceBackupService $backupService): StreamedResponse
    {
        $user = auth()->user();
        $backupData = $backupService->buildExportPayload($user);

        $jsonContent = json_encode($backupData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $headers = [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="nikash_finance_backup_' . date('Ymd_His') . '.json"',
        ];

        return response()->stream(function () use ($jsonContent) {
            echo $jsonContent;
        }, 200, $headers);
    }

    /**
     * Restore financial data from a previously exported JSON backup.
     */
    public function restoreBackup(Request $request, FinanceBackupService $backupService): RedirectResponse
    {
        $user = auth()->user();

        $request->validate([
            'backup_file' => 'required|file|mimes:json,txt|max:10240',
            'password' => 'required|string|size:4|regex:/^[0-9]+$/',
        ]);

        if (! $this->verifySecurityPin($user, $request->password)) {
            return redirect()->back()->withErrors([
                'restore_password' => __('Wrong PIN! Backup could not be restored.'),
            ]);
        }

        $content = file_get_contents($request->file('backup_file')->getRealPath());
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($data)) {
            return redirect()->back()->with('error', 'Invalid backup file. Please upload a valid JSON backup.');
        }

        try {
            $backupService->restoreForUser($user, $data);
        } catch (\InvalidArgumentException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        } catch (\Throwable $e) {
            report($e);

            return redirect()->back()->with('error', 'Backup restore failed. Please try again with a valid backup file.');
        }

        $msg = ($user->language ?? 'en') === 'bn'
            ? 'ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে।'
            : 'Backup restored successfully.';

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Reset / Archive all user financial transactions, budget plans, loans, etc.
     */
    public function resetData(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $request->validate([
            'password' => 'required|string|size:4|regex:/^[0-9]+$/',
        ]);

        if (! $this->verifySecurityPin($user, $request->password)) {
            return redirect()->back()->withErrors(['password' => __('Wrong PIN! Data could not be reset.')]);
        }

        DB::transaction(function () use ($user) {
            Transaction::where('user_id', $user->id)->delete();
            Loan::where('user_id', $user->id)->delete();
            SavingsGoal::where('user_id', $user->id)->delete();
            RecurringBill::where('user_id', $user->id)->delete();
            Note::where('user_id', $user->id)->delete();
            Notification::where('user_id', $user->id)->delete();
            
            // Set all active account balances to zero
            Account::where('user_id', $user->id)->update(['balance' => 0]);
        });

        return redirect()->back()->with('success', 'আপনার সকল ফিন্যান্সিয়াল ডাটা রিসেট করা হয়েছে। আপনি আবার শুরু করতে পারেন।');
    }

    private function verifySecurityPin(User $user, string $pin): bool
    {
        if (! empty($user->pin_code)) {
            return $user->pin_code === $pin;
        }

        return Hash::check($pin, $user->password);
    }
}
