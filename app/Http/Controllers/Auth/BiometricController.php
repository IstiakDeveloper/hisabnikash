<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class BiometricController extends Controller
{
    public function registerOptions(Request $request)
    {
        $user = auth()->user();
        $challenge = Str::random(32);
        session(['biometric_challenge' => $challenge]);

        return response()->json([
            'challenge' => base64_encode($challenge),
            'user' => [
                'id' => base64_encode((string) $user->id),
                'name' => $user->username ?: $user->email,
                'displayName' => $user->name,
            ],
            'rp' => [
                'name' => config('app.name', 'Nikash'),
                'id' => $request->getHost(),
            ]
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'credential_id' => 'required|string',
        ]);

        $user = auth()->user();
        $user->update([
            'biometric_credential_id' => $request->credential_id,
        ]);

        return response()->json(['success' => true, 'message' => 'ডিভাইস বায়োমেট্রিক সফলভাবে রেজিস্টার করা হয়েছে।']);
    }

    public function loginOptions(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
        ]);

        $user = User::where('username', $request->username)
            ->orWhere('email', $request->username)
            ->first();

        if (!$user || !$user->biometric_credential_id) {
            return response()->json([
                'success' => false,
                'message' => 'এই ইউজারের কোনো বায়োমেট্রিক রেজিস্টার করা নেই।'
            ], 422);
        }

        $challenge = Str::random(32);
        session(['biometric_challenge' => $challenge]);
        session(['biometric_user_id' => $user->id]);

        return response()->json([
            'challenge' => base64_encode($challenge),
            'credentialId' => $user->biometric_credential_id,
            'rpId' => $request->getHost(),
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'credential_id' => 'required|string',
        ]);

        $userId = session('biometric_user_id');
        $challenge = session('biometric_challenge');

        if (!$userId || !$challenge) {
            return response()->json([
                'success' => false,
                'message' => 'বায়োমেট্রিক সেশন শেষ হয়ে গেছে। আবার চেষ্টা করুন।'
            ], 422);
        }

        $user = User::find($userId);

        if (!$user || $user->biometric_credential_id !== $request->credential_id) {
            return response()->json([
                'success' => false,
                'message' => 'বায়োমেট্রিক ভেরিফিকেশন মেলেনি!'
            ], 422);
        }

        // Login user
        Auth::login($user, true);

        // Clear biometric session
        session()->forget(['biometric_challenge', 'biometric_user_id']);

        return response()->json([
            'success' => true,
            'redirect' => '/dashboard'
        ]);
    }
}
