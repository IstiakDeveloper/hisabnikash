import { router } from '@inertiajs/react';

type PinResult = { pin?: string; biometricCredId?: string } | null;
type PinResolver = (result: PinResult) => void;

let pendingResolver: PinResolver | null = null;
let openModal: (() => void) | null = null;
let removeGuard: (() => void) | null = null;

const excludedPathPatterns = [
    /\/settings\/pin-verify$/,
    /\/settings\/pin$/,
    /\/settings\/language$/,
    /\/settings\/reset$/,
    /\/settings\/restore$/,
    /\/logout$/,
    /\/biometrics\//,
];

function getEffectiveMethod(visit: { method?: string; data?: Record<string, unknown>; url: string }): string {
    const method = (visit.method || 'get').toLowerCase();

    if (method === 'post') {
        const spoofed = visit.data?._method;

        if (typeof spoofed === 'string' && spoofed.length > 0) {
            return spoofed.toLowerCase();
        }

        const path = visit.url.startsWith('http') ? new URL(visit.url).pathname : visit.url;

        if (path.endsWith('/settings/profile')) {
            return 'patch';
        }
    }

    return method;
}

function isProtectedMethod(method: string): boolean {
    return ['put', 'patch', 'delete'].includes(method.toLowerCase());
}

function isExcludedUrl(url: string): boolean {
    const path = url.startsWith('http') ? new URL(url).pathname : url;

    return excludedPathPatterns.some((pattern) => pattern.test(path));
}

export function registerPinActionModal(opener: () => void): () => void {
    openModal = opener;

    return () => {
        if (openModal === opener) {
            openModal = null;
        }
    };
}

export function requestActionPin(): Promise<PinResult> {
    return new Promise((resolve) => {
        pendingResolver = resolve;
        openModal?.();
    });
}

export function submitActionPin(pin: string): void {
    pendingResolver?.({ pin });
    pendingResolver = null;
}

export function submitActionBiometric(biometricCredId: string): void {
    pendingResolver?.({ biometricCredId });
    pendingResolver = null;
}

export function cancelActionPin(): void {
    pendingResolver?.(null);
    pendingResolver = null;
}

export function setupPinRouterGuard(getHasPin: () => boolean): () => void {
    removeGuard?.();

    removeGuard = router.on('before', (event) => {
        if (!getHasPin()) {
            return;
        }

        const visit = event.detail.visit;
        const method = getEffectiveMethod(visit as any);

        if (!isProtectedMethod(method) || isExcludedUrl(visit.url.toString())) {
            return;
        }

        const headers = visit.headers ?? {};

        if (headers['X-Pin-Code'] || headers['X-Biometric-Credential-ID']) {
            return;
        }

        event.preventDefault();

        requestActionPin().then((result) => {
            if (!result) {
                return;
            }

            const newHeaders = { ...headers };
            if (result.pin) {
                newHeaders['X-Pin-Code'] = result.pin;
            } else if (result.biometricCredId) {
                newHeaders['X-Biometric-Credential-ID'] = result.biometricCredId;
            }

            router.visit(visit.url, {
                method: visit.method,
                data: visit.data,
                replace: visit.replace,
                preserveState: visit.preserveState,
                preserveScroll: visit.preserveScroll,
                only: visit.only,
                except: visit.except,
                headers: newHeaders,
            });
        });

        return false;
    });

    return () => {
        removeGuard?.();
        removeGuard = null;
    };
}
