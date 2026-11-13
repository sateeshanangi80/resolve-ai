import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { panelPath } from '../navigation';
import type { SessionUser } from '../App';
import type { Ticket } from '../types/ticket';
interface Summary {
    counts: Record<'Open' | 'In Progress' | 'Resolved' | 'Closed', number>;
    total: number;
    recent: Ticket[];
    unassigned: number;
    activeAgents: number;
}
export default function Dashboard({ user }: {
    user: SessionUser;
}) {
    const [data, setData] = useState<Summary | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
    const base = panelPath(user);
    useEffect(() => {
        const controller = new AbortController();
        apiRequest<{
            data: Summary;
        }>('/api/workspace/dashboard', { signal: controller.signal }).then(r => { if (!controller.signal.aborted)
            setData(r.data); }).catch(err => { if (!controller.signal.aborted)
            setError(err instanceof Error ? err.message : 'Unable to load your overview.'); }).finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [revision]);
    const admin = user.role === 'Admin';
    const agent = user.role === 'SupportAgent';
    return <section className="panel-overview"><div className="panel-heading"><div><span className="eyebrow">{admin ? 'ADMIN CONTROL CENTER' : agent ? 'SUPPORT WORKSPACE' : 'YOUR CUSTOMER SPACE'}</span><h1>{admin ? 'A clear view of your team.' : agent ? 'Your work, in focus.' : `Welcome, ${user.name.split(' ')[0]}.`}</h1><p>{admin ? 'Manage people, connect the right agents, and keep support moving.' : agent ? 'See what needs your attention and move assigned requests forward.' : 'Raise a request and follow every step toward a resolution.'}</p></div><a className="button button-primary" href={`#${base}/tickets`}>{admin ? 'Manage tickets' : agent ? 'Open my queue' : 'View my requests'}</a></div>
    {error && <div className="alert alert-error" role="alert">{error} <button className="text-button" onClick={() => { setLoading(true); setError(''); setRevision(v => v + 1); }}>Try again</button></div>}
    {loading && <div className="overview-skeleton" role="status">Loading your workspace overview...</div>}
    {!loading && data && !error && <><div className="metric-grid">{[['All requests', data.total, 'Your accessible tickets', ''], ['Open', data.counts.Open, 'Waiting to move forward', 'Open'], ['In progress', data.counts['In Progress'], 'Currently being worked on', 'In Progress'], ['Resolved', data.counts.Resolved, 'Requests marked resolved', 'Resolved']].map(([label, value, caption, status]) => <a className="metric-card" href={`#${base}/tickets${status ? `?status=${encodeURIComponent(String(status))}` : ''}`} key={label}><span>{label}</span><strong>{value}</strong><small>{caption}</small></a>)}</div>
      <div className="overview-columns"><section className="recent-panel"><div className="panel-card-heading"><div><span className="eyebrow">LATEST MOVEMENT</span><h2>Recently updated</h2></div><a href={`#${base}/tickets`}>View all &rarr;</a></div>{data.recent.length === 0 ? <div className="panel-empty"><h3>{agent ? 'Your queue is clear.' : 'Every resolution starts with a request.'}</h3><p>{agent ? 'Requests appear here when an admin assigns them to you.' : 'Create your first ticket to get started.'}</p><a className="button button-secondary" href={`#${base}/tickets`}>{agent ? 'Open my queue' : 'Open requests'}</a></div> : <div className="recent-list">{data.recent.map(ticket => <a className="recent-ticket" key={ticket._id} href={`#${base}/tickets?ticket=${ticket._id}`}><span className="recent-symbol" aria-hidden="true">&#9636;</span><div><strong>{ticket.title}</strong><small>#{ticket._id.slice(-6).toUpperCase()} &middot; {ticket.category}</small></div><span className={`ticket-status status-${(ticket.status || 'Open').toLowerCase().replaceAll(' ', '-')}`}>{ticket.status}</span></a>)}</div>}</section>
      <aside className="overview-side"><span className="eyebrow">{admin ? 'TEAM AT A GLANCE' : 'A SIMPLE SUPPORT FLOW'}</span><h2>{admin ? 'Keep work connected.' : agent ? 'One step closer.' : 'You’re in the right place.'}</h2>{admin ? <><div className="overview-side-stat"><strong>{data.activeAgents}</strong><span>active support agents</span></div><a className="overview-side-stat" href={`#${base}/tickets?assignment=unassigned`}><strong>{data.unassigned}</strong><span>requests without an assigned agent &rarr;</span></a><a className="button button-secondary" href={`#${base}/people`}>Manage people</a></> : <><p>{agent ? 'Review the full issue, update the current status, and mark it resolved when the work is complete.' : 'Describe your issue clearly. Your team will assign the right agent and update your request as work progresses.'}</p><ol><li>{agent ? 'Review your assigned queue' : 'Create a support request'}</li><li>{agent ? 'Move work into progress' : 'Follow the current status'}</li><li>{agent ? 'Resolve and close the loop' : 'View the resolution status'}</li></ol></>}</aside></div></>}
  </section>;
}
