import { useSyncExternalStore } from 'react';
import type { SessionUser } from './App';
export const roleLabels = { Customer: 'Customer', SupportAgent: 'Support agent', Admin: 'Administrator' };
export const rolePaths = { Customer: '/customer', SupportAgent: '/support', Admin: '/admin' };
function subscribe(callback: () => void) {
    window.addEventListener('hashchange', callback);
    return () => window.removeEventListener('hashchange', callback);
}
export function useRoute() {
    return useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || '/', () => '/');
}
export function navigate(path: string) { window.location.hash = path; }
export function panelPath(user: SessionUser) { return rolePaths[user.role]; }
