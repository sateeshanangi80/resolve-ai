import AccountPanel from './components/AccountPanel';
import Brand from './components/Brand';
import { useEffect, useState } from 'react';
import { ApiError, apiRequest, refreshSession, setAccessToken } from './api';
import { navigate, panelPath, roleLabels, useRoute } from './navigation';
import TicketList from './components/TicketList';
import Dashboard from './components/Dashboard';
import PeoplePanel from './components/PeoplePanel';
import PublicHome from './components/PublicHome';
import AuthScreen from './components/AuthScreen';
import './App.css';
import './workspace.css';
import './panels.css';
export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: 'Customer' | 'SupportAgent' | 'Admin';
}
let startup: Promise<SessionUser> | null = null;
function restore() {
    if (!startup)
        startup = refreshSession().then(() => apiRequest<{
            data: SessionUser;
        }>('/api/auth/me')).then(r => r.data).finally(() => { startup = null; });
    return startup;
}
export default function App() {
    const route = useRoute();
    const path = route.split('?')[0];
    const [user, setUser] = useState<SessionUser | null>(null);
    const [checking, setChecking] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    useEffect(() => {
        let active = true;
        restore().then(value => { if (active)
            setUser(value); }).catch(err => {
            if (active && (!(err instanceof ApiError) || ![401, 403].includes(err.status)))
                setNotice('We could not restore your session. Please sign in again.');
        }).finally(() => { if (active)
            setChecking(false); });
        const expired = () => { setUser(null); setNotice('Your session has expired. Please sign in again.'); };
        window.addEventListener('session-expired', expired);
        return () => { active = false; window.removeEventListener('session-expired', expired); };
    }, []);
    useEffect(() => {
        if (!user)
            return;
        let active = true;
        const checkProfile = () => {
            apiRequest<{
                data: SessionUser;
            }>('/api/auth/me').then(r => { if (active)
                setUser(previous => previous && JSON.stringify(previous) === JSON.stringify(r.data) ? previous : r.data); }).catch(err => {
                if (active && err instanceof ApiError && [401, 403].includes(err.status)) {
                    setAccessToken(null);
                    setUser(null);
                    setNotice('Your access changed. Please sign in again.');
                }
            });
        };
        window.addEventListener('focus', checkProfile);
        return () => { active = false; window.removeEventListener('focus', checkProfile); };
    }, [user]);
    async function logout() {
        setBusy(true);
        setError('');
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
            setAccessToken(null);
            setUser(null);
            setNotice('You have been signed out.');
            navigate('/');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to sign out. Try again.');
        }
        finally {
            setBusy(false);
        }
    }
    if (path === '/')
        return <PublicHome user={user}/>;
    if (checking)
        return <main className="session-loading" role="status"><Brand compact/><h2>Opening ResolveAI</h2><p>Checking your secure session...</p></main>;
    const isPanel = /^\/(admin|support|customer)(\/|$)/.test(path);
    const isAuth = /^\/login\/(admin|support|customer)$/.test(path) || ['/register', '/setup'].includes(path) || path === '/accept-invite';
    if (isAuth)
        return <AuthScreen key={route} route={route} onLogin={value => { setUser(value); setNotice(''); }} notice={notice}/>;
    if (!isPanel)
        return <main className="session-loading"><h1>Page not found</h1><p>This page does not exist.</p><a className="button button-primary" href="#/">Back to website</a></main>;
    if (!user) {
        const portal = path.split('/')[1];
        return <AuthScreen key={portal} route={`/login/${portal}`} onLogin={value => { setUser(value); setNotice(''); }} notice={notice}/>;
    }
    const base = panelPath(user);
    if (path !== base && !path.startsWith(`${base}/`))
        return <main className="session-loading"><h1>This panel belongs to a different role.</h1><p>You are signed in as {roleLabels[user.role].toLowerCase()}.</p><a className="button button-primary" href={`#${base}`}>Open my panel</a><button className="text-button" disabled={busy} onClick={logout}>Sign out</button></main>;
    const page = path.slice(base.length).replace(/^\//, '') || 'overview';
    const admin = user.role === 'Admin';
    const title = admin ? 'Admin panel' : user.role === 'SupportAgent' ? 'Support panel' : 'Customer panel';
    const ticketLabel = admin ? 'All tickets' : user.role === 'SupportAgent' ? 'My queue' : 'My requests';
    const links = [{ id: 'overview', label: 'Overview', symbol: '◫', href: base }, { id: 'tickets', label: ticketLabel, symbol: '▤', href: `${base}/tickets` }, ...(admin ? [{ id: 'people', label: 'People & access', symbol: '◎', href: `${base}/people` }] : []), { id: 'account', label: 'My account', symbol: '○', href: `${base}/account` }];
    const query = new URLSearchParams(route.split('?')[1] || '');
    return <div className={`workspace panel-${user.role.toLowerCase()}`}><a className="skip-link" href="#workspace-main" onClick={e => { e.preventDefault(); document.getElementById('workspace-main')?.focus(); }}>Skip to content</a><aside className="sidebar"><Brand /><div className="workspace-label">WORKSPACE</div><nav aria-label={`${title} navigation`}>{links.map(link => <a key={link.id} className={page === link.id ? 'nav-item active' : 'nav-item'} href={`#${link.href}`} aria-current={page === link.id ? 'page' : undefined}><span aria-hidden="true">{link.symbol}</span>{link.label}</a>)}</nav><div className="sidebar-note"><strong>{admin ? 'Built around your team.' : user.role === 'SupportAgent' ? 'Your queue. Your focus.' : 'Support starts here.'}</strong><p>{admin ? 'Bring people and requests together in one clear workspace.' : user.role === 'SupportAgent' ? 'Every update brings a request closer to resolution.' : 'A clear view of your requests, from start to finish.'}</p></div><div className="sidebar-profile"><span className="profile-avatar">{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></div></div></aside><div className="workspace-body"><header className="workspace-topbar"><span>{title}<span className="breadcrumb">/ {links.find(link => link.id === page)?.label || 'Page'}</span></span><div><button className="text-button" disabled={busy} onClick={logout}>{busy ? 'Signing out...' : 'Sign out'}</button></div></header><main id="workspace-main" tabIndex={-1}>{error && <div className="alert alert-error" role="alert">{error}</div>}{page === 'overview' ? <Dashboard key={base} user={user}/> : page === 'tickets' ? <TicketList key={route} user={user} initialStatus={query.get('status') || ''} initialAssignment={admin ? query.get('assignment') || '' : ''} initialTicketId={query.get('ticket') || null}/> : page === 'people' && admin ? <PeoplePanel user={user}/> : page === 'account' ? <AccountPanel user={user}/> : <section className="panel-empty"><h1>Page not available</h1><a href={`#${base}`}>Go to your overview</a></section>}</main><footer className="workspace-footer">ResolveAI<span>{title} &middot; One connected support experience.</span></footer></div></div>;
}
