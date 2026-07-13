<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = 'en';

        if ($request->user()) {
            $locale = $request->user()->language ?? session('locale', 'en');
        } else {
            $locale = session('locale', 'en');
        }

        // Validate locale to prevent arbitrary values
        if (!in_array($locale, ['en', 'bn'])) {
            $locale = 'en';
        }

        App::setLocale($locale);

        return $next($request);
    }
}
