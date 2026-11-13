import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest } from '../api';
import type { SessionUser } from '../App';
import { categories, priorities, statuses } from '../types/ticket';
import type { Ticket } from '../types/ticket';
import Modal from './Modal';
interface Props {
    ticketId: string;
    user: SessionUser;
    onClose: () => void;
    onUpdated: () => void;
    onDeleted: () => void;
}
export default function TicketDetails({ ticketId, user, onClose, onUpdated, onDeleted }: Props) {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [draft, setDraft] = useState({ title: '', description: '', category: 'General', priority: 'Medium', status: 'Open' });
    const [agent, setAgent] = useState('');
    const [agents, setAgents] = useState<{
        _id: string;
        name: string;
        email: string;
    }[]>([]);
    const [agentError, setAgentError] = useState('');
    const [agentRevision, setAgentRevision] = useState(0);
    const [agentsLoading, setAgentsLoading] = useState(adminRole(user));
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [confirm, setConfirm] = useState(false);
    const admin = user.role === 'Admin';
    const canEdit = admin || user.role === 'SupportAgent';
    function adminRole(value: SessionUser) { return value.role === 'Admin'; }
    useEffect(() => {
        if (!admin)
            return;
        const controller = new AbortController();
        apiRequest<{
            data: {
                _id: string;
                name: string;
                email: string;
            }[];
        }>('/api/workspace/agents', { signal: controller.signal })
            .then(result => { if (!controller.signal.aborted)
            setAgents(result.data); })
            .catch(err => { if (!controller.signal.aborted)
            setAgentError(err instanceof Error ? err.message : 'Unable to load agents.'); })
            .finally(() => { if (!controller.signal.aborted)
            setAgentsLoading(false); });
        return () => controller.abort();
    }, [admin, agentRevision]);
    function apply(value: Ticket) { setTicket(value); setDraft({ title: value.title, description: value.description, category: value.category, priority: value.priority, status: value.status || 'Open' }); }
    useEffect(() => {
        const controller = new AbortController();
        apiRequest<{
            data: Ticket;
        }>(`/api/tickets/${ticketId}`, { signal: controller.signal }).then(r => {
            if (!controller.signal.aborted)
                apply(r.data);
        }).catch(err => {
            if (!controller.signal.aborted)
                setError(err instanceof Error ? err.message : 'Unable to load ticket.');
        }).finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [ticketId, revision]);
    async function mutate(kind: 'save' | 'assign' | 'delete', event?: FormEvent) {
        event?.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const result = await apiRequest<{
                data: Ticket;
            }>(`/api/tickets/${ticketId}${kind === 'assign' ? '/assign' : ''}`, {
                method: kind === 'delete' ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' },
                ...(kind === 'delete' ? {} : { body: JSON.stringify(kind === 'assign' ? { assignedTo: agent.trim() } : admin ? draft : { status: draft.status }) })
            });
            if (kind === 'delete') {
                onDeleted();
                onClose();
                return;
            }
            apply(result.data);
            onUpdated();
            setNotice(kind === 'assign' ? 'Ticket assigned successfully.' : 'Changes saved successfully.');
        }
        catch (err) {
            setError(err instanceof ApiError && err.issues.length ? err.issues.map(i => i.message).join(' ') : err instanceof Error ? err.message : 'Unable to save.');
        }
        finally {
            setBusy(false);
        }
    }
    const assignee = ticket?.assignedTo;
    return <Modal titleId="ticket-details-title" onClose={onClose} busy={busy} wide className="ticket-details-modal"><div className="modal-header"><div><span>TICKET #{ticketId.slice(-6).toUpperCase()}</span><h2 id="ticket-details-title">{ticket?.title || 'Ticket details'}</h2></div><button className="close-button" onClick={onClose} disabled={busy} aria-label="Close ticket details">×</button></div>{loading && <p role="status">Loading ticket…</p>}{error && <div className="alert alert-error" role="alert">{error}{!ticket && <button className="text-button" onClick={() => { setLoading(true); setError(''); setRevision(v => v + 1); }}>Try again</button>}</div>}{notice && <div className="alert alert-success" role="status">{notice}</div>}{ticket && !loading && <><div className="ticket-details-meta"><span className="ticket-category">{ticket.category}</span><span className={`ticket-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span><span className="role-chip">{ticket.status}</span></div><div className="detail-assignment"><span className="detail-label">Assigned to</span><p>{typeof assignee === 'object' && assignee ? `${assignee.name} · ${assignee.email}` : assignee || 'Awaiting assignment'}</p></div>{canEdit ? <form onSubmit={e => void mutate('save', e)}><fieldset disabled={busy || confirm}>{admin && <><div className="form-group"><label htmlFor="edit-title">Title</label><input className="field" id="edit-title" minLength={3} maxLength={150} required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></div><div className="form-group"><label htmlFor="edit-description">Description</label><textarea className="field" id="edit-description" minLength={10} maxLength={2000} required value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></div><div className="form-row">{([['category', categories], ['priority', priorities]] as const).map(([key, options]) => <div className="form-group" key={key}><label htmlFor={`edit-${key}`}>{key === 'category' ? 'Category' : 'Priority'}</label><select className="field" id={`edit-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}>{options.map(v => <option key={v}>{v}</option>)}</select></div>)}</div></>}{!admin && <p className="detail-description">{ticket.description}</p>}<div className="ticket-details-status"><label htmlFor="edit-status">Status</label><select className="field" id="edit-status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>{statuses.map(v => <option key={v}>{v}</option>)}</select><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></fieldset></form> : <div className="detail-description"><span className="detail-label">Description</span><p>{ticket.description}</p><small>You can follow progress here. Your support team manages updates.</small></div>}{admin && <form className="assignment-form" onSubmit={e => void mutate('assign', e)}><fieldset disabled={busy || confirm}><label htmlFor="agent-id">Assign a support agent</label><p className="field-help">Choose an active support agent from your team. Invite people from People &amp; access.</p>{agentError && <div className="alert alert-error" role="alert">{agentError}<button className="text-button" type="button" onClick={() => { setAgentError(''); setAgentsLoading(true); setAgentRevision(v => v + 1); }}>Retry agents</button></div>}<div className="assignment-controls"><select className="field" id="agent-id" required value={agent} onChange={e => setAgent(e.target.value)} disabled={agentsLoading || Boolean(agentError)}><option value="">{agentsLoading ? "Loading agents..." : agents.length ? "Select a support agent" : "No active agents yet"}</option>{agents.map(person => <option value={person._id} key={person._id}>{person.name} - {person.email}</option>)}</select><button className="button button-secondary" type="submit" disabled={!agent || agentsLoading || Boolean(agentError)}>Assign</button></div></fieldset></form>}<div className="ticket-details-footer">{admin && (confirm ? <div className="ticket-delete-confirm"><p>Permanently delete this ticket? This cannot be undone.</p><div><button className="button button-secondary" disabled={busy} onClick={() => setConfirm(false)}>Keep ticket</button><button className="button button-danger" disabled={busy} onClick={() => void mutate('delete')}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div></div> : <button className="ticket-delete-link" disabled={busy} onClick={() => setConfirm(true)}>Delete ticket</button>)}{!confirm && <button className="button button-secondary" disabled={busy} onClick={onClose}>Done</button>}</div></>}</Modal>;
}
