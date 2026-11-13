import Brand from './Brand';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest, setAccessToken } from '../api';
import { navigate, panelPath } from '../navigation';
import type { SessionUser } from '../App';
interface Props {
    route: string;
    onLogin: (user: SessionUser) => void;
    notice?: string;
}
export default function AuthScreen({ route, onLogin, notice = '' }: Props) {
    const register = route === '/register';
    const setup = route === '/setup';
    const invite = route.startsWith('/accept-invite');
    const portal = route.includes('admin') ? 'Admin' : route.includes('support') ? 'Support' : 'Customer';
    const token = new URLSearchParams(route.split('?')[1] || '').get('token') || '';
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState(notice);
    const [setupRevision, setSetupRevision] = useState(0);
    const [setupState, setSetupState] = useState<{
        hasAdmin: boolean;
        setupEnabled: boolean;
    } | null>(null);
    const [invitation, setInvitation] = useState<{
        name: string;
        email: string;
        role: string;
    } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        if (setup)
            apiRequest<{
                data: {
                    hasAdmin: boolean;
                    setupEnabled: boolean;
                };
            }>('/api/portal/setup', { signal: controller.signal }).then(r => { if (!controller.signal.aborted)
                setSetupState(r.data); }).catch(err => { if (!controller.signal.aborted)
                setError(err instanceof Error ? err.message : 'Unable to check setup.'); });
        if (invite)
            apiRequest<{
                data: {
                    name: string;
                    email: string;
                    role: string;
                };
            }>('/api/portal/invitations/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: controller.signal }).then(r => { if (!controller.signal.aborted)
                setInvitation(r.data); }).catch(err => { if (!controller.signal.aborted)
                setError(err instanceof Error ? err.message : 'Unable to open invitation.'); });
        return () => controller.abort();
    }, [setup, invite, token, setupRevision]);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setMessage('');
        const form = new FormData(event.currentTarget);
        const password = String(form.get('password'));
        const email = String(form.get('email') || '').trim();
        try {
            if (register || setup || invite) {
                if (new TextEncoder().encode(password).length > 72)
                    throw new Error('Use a password no longer than 72 UTF-8 bytes.');
                if (password !== String(form.get('confirmPassword')))
                    throw new Error('Passwords do not match.');
            }
            if (invite) {
                const result = await apiRequest<{
                    data: {
                        email: string;
                        role: SessionUser['role'];
                    };
                }>('/api/portal/invitations/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
                const session = await apiRequest<{
                    data: {
                        user: SessionUser;
                        accessToken: string;
                    };
                }>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: result.data.email, password }) });
                setAccessToken(session.data.accessToken);
                onLogin(session.data.user);
                window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${panelPath(session.data.user)}`);
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
            else if (setup || register) {
                const payload = { name: String(form.get('name')).trim(), email, password, ...(setup ? { setupKey: String(form.get('setupKey')) } : {}) };
                await apiRequest(setup ? '/api/portal/setup' : '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                // Sign in through the normal credentials endpoint after creating the account.
                const result = await apiRequest<{
                    data: {
                        user: SessionUser;
                        accessToken: string;
                    };
                }>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                setAccessToken(result.data.accessToken);
                onLogin(result.data.user);
                navigate(panelPath(result.data.user));
            }
            else {
                const result = await apiRequest<{
                    data: {
                        user: SessionUser;
                        accessToken: string;
                    };
                }>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, portalRole: portal === 'Support' ? 'SupportAgent' : portal === 'Admin' ? 'Admin' : 'Customer' }) });
                setAccessToken(result.data.accessToken);
                onLogin(result.data.user);
                navigate(panelPath(result.data.user));
            }
        }
        catch (err) {
            setError(err instanceof ApiError && err.issues.length ? err.issues.map(i => i.message).join(' ') : err instanceof Error ? err.message : 'Unable to continue.');
        }
        finally {
            setBusy(false);
        }
    }
    const setupBlocked = setup && (!setupState || !setupState.setupEnabled);
    const inviteBlocked = invite && !invitation;
    return <main className="auth-layout"><section className="auth-story"><Brand /><div><span className="eyebrow">{setup ? 'YOUR TEAM STARTS HERE' : invite ? 'YOU ARE INVITED' : 'ONE WEBSITE. THE RIGHT WORKSPACE.'}</span><h1>{setup ? <>Build your<br />support team.</> : invite ? <>A place<br />on the team.</> : <>Great support.<br /><em>Your way.</em></>}</h1><p>{setup ? 'Activate your existing account or create a new one as the first administrator. Then invite your team and manage workspace access.' : invite ? 'Accept your invitation, choose your own password, and join your assigned workspace.' : 'A dedicated panel for customers, support agents, and administrators. Connected by one clear support flow.'}</p></div><a href="#/" className="text-button">&larr; Back to website</a></section><section className="auth-panel"><div className="auth-form"><span className="eyebrow">{setup ? 'FIRST ADMINISTRATOR' : invite ? 'ACCEPT INVITATION' : register ? 'CUSTOMER REGISTRATION' : `${portal.toUpperCase()} PORTAL`}</span><h2>{setup ? 'Set up your workspace.' : invite ? 'Join your team.' : register ? 'Let’s get you started.' : `${portal} sign in.`}</h2><p>{invite && invitation ? `${invitation.name}, you have been invited as ${invitation.role === 'SupportAgent' ? 'a support agent' : invitation.role === 'Admin' ? 'an administrator' : 'a customer'} for ${invitation.email}.` : register ? 'Create an account to raise and track requests.' : 'Use your account to open your dedicated panel.'}</p>
      {!register && !setup && !invite && <div className="portal-switch" aria-label="Choose sign-in portal">{['customer', 'support', 'admin'].map(p => <a key={p} href={`#/login/${p}`} className={portal.toLowerCase() === p ? 'selected' : ''}>{p === 'support' ? 'Support' : p === 'admin' ? 'Admin' : 'Customer'}</a>)}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}{error && <div className="alert alert-error" role="alert">{error}</div>}
      {setup && setupState && !setupState.setupEnabled && <div className="queue-context"><p>{setupState.hasAdmin ? 'Administrator setup is already complete. Use Admin sign in to open your workspace.' : 'Administrator setup is disabled on the running backend. Configure ADMIN_SETUP_KEY in backend/.env, restart the backend, then select Check again.'}</p></div>}
      {setup && (error || (setupState && !setupState.setupEnabled && !setupState.hasAdmin)) && <button type="button" className="button button-secondary" onClick={() => { setSetupState(null); setError(''); setSetupRevision(value => value + 1); }}>Check again</button>}
      {setup && !setupState && !error && <p role="status">Checking workspace setup...</p>}{invite && !invitation && !error && <p role="status">Checking your invitation...</p>}
      <form onSubmit={submit}><fieldset disabled={busy || Boolean(setupBlocked) || Boolean(inviteBlocked)}>{(register || setup) && <div className="form-group"><label htmlFor="name">Full name</label><input className="field" id="name" name="name" required minLength={2} maxLength={80} autoComplete="name"/></div>}{!invite && <div className="form-group"><label htmlFor="email">Email address</label><input className="field" id="email" name="email" type="email" required autoComplete="email"/></div>}{setup && <div className="form-group"><label htmlFor="setup-key">Workspace setup key</label><input className="field" id="setup-key" name="setupKey" type="password" required minLength={32} maxLength={256} autoComplete="off"/><small className="field-help">Provided by your workspace owner. Used only for the first administrator. If this email is already registered, enter its existing password below.</small></div>}<div className="form-group"><label htmlFor="password">{invite ? 'Choose your password' : 'Password'}</label><input className="field" id="password" name="password" type="password" required minLength={register || setup || invite ? 8 : 1} autoComplete={register || setup || invite ? 'new-password' : 'current-password'}/></div>{(register || setup || invite) && <div className="form-group"><label htmlFor="confirm-password">Confirm password</label><input className="field" id="confirm-password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password"/><small className="field-help">At least 8 characters. Maximum 72 UTF-8 bytes.</small></div>}<button className="button button-primary auth-submit" type="submit">{busy ? 'Please wait...' : setup ? 'Activate administrator access' : invite ? 'Activate my account' : register ? 'Create customer account' : 'Sign in'}</button></fieldset></form>
      {!setup && !invite && (register || portal === 'Customer') && <p className="auth-switch">{register ? 'Already registered?' : 'Need a customer account?'} <a href={register ? '#/login/customer' : '#/register'}>{register ? 'Sign in' : 'Register'}</a></p>}{!register && !setup && !invite && portal === 'Support' && <p className="field-help">Activate your support account using your team invitation before signing in.</p>}{!register && !setup && !invite && portal === 'Admin' && <p className="field-help">Setting up this workspace for the first time? <a href="#/setup">Activate the first administrator</a> using your owner setup key. Additional administrators join through an invitation.</p>}{setup && <p className="auth-switch"><a href="#/login/admin">Go to admin sign in</a></p>}<div className="auth-footnote">Your account permissions determine your panel.</div>
    </div></section></main>;
}
