<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePinForMutation
{
    /**
     * @var array<int, string>
     */
    private array $excludedPatterns = [
        'settings/pin',
        'settings/pin-verify',
        'settings/language',
        'settings/reset',
        'settings/restore',
        'logout',
        'biometrics/*',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || empty($user->pin_code)) {
            return $next($request);
        }

        if (! $this->requiresPin($request)) {
            return $next($request);
        }

        foreach ($this->excludedPatterns as $pattern) {
            if ($request->is($pattern)) {
                return $next($request);
            }
        }

        $pin = $request->header('X-Pin-Code') ?? $request->input('pin_code');
        $biometricCredId = $request->header('X-Biometric-Credential-ID') ?? $request->input('biometric_credential_id');

        if (!empty($biometricCredId) && !empty($user->biometric_credential_id) && $user->biometric_credential_id === $biometricCredId) {
            return $next($request);
        }

        if ($pin !== $user->pin_code) {
            $message = app()->getLocale() === 'bn'
                ? 'ভুল পিন কোড! সম্পাদনা বা মুছে ফেলা যায়নি।'
                : 'Wrong PIN code! Could not edit or delete.';

            if ($request->header('X-Inertia')) {
                return redirect()->back()->with('error', $message);
            }

            return response()->json(['message' => $message], 403);
        }

        return $next($request);
    }

    private function requiresPin(Request $request): bool
    {
        if (in_array($request->method(), ['PUT', 'PATCH', 'DELETE'], true)) {
            return true;
        }

        if ($request->method() === 'POST') {
            $spoofed = strtoupper((string) $request->input('_method', ''));

            if (in_array($spoofed, ['PUT', 'PATCH', 'DELETE'], true)) {
                return true;
            }

            if ($request->is('settings/profile')) {
                return true;
            }
        }

        return false;
    }
}
