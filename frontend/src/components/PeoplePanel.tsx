import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest } from '../api';
import { roleLabels } from '../navigation';
import Modal from './Modal';
import type { SessionUser } from '../App';
import type { Pagination } from '../types/ticket';
interface Person {
    _id: string;
    name: string;
    email: string;
    role: SessionUser['role'];
    isActive: boolean;
    createdAt: string;
}
interface Invitation {
    _id: string;
    name: string;
    email: string;
    role: SessionUser['role'];
    expiresAt: string;
}
const messageFor = (err: unknown) => err instanceof ApiError && err.issues.length ? err.issues.map(i => i.message).join(' ') : err instanceof Error ? err.message : 'Unable to complete this action.';
export default function PeoplePanel({ user }: {
    user: SessionUser;
}) {
    const [people, setPeople] = useState<Person[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [role, setRole] = useState('');
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [invitationLink, setInvitationLink] = useState('');
    const [editing, setEditing] = useState<Person | null>(null);
    const [editRole, setEditRole] = useState('Customer');
    const [editActive, setEditActive] = useState(true);
    const [revoking, setRevoking] = useState<Invitation | null>(null);
    const [busy, setBusy] = useState(false);
    const [modalError, setModalError] = useState('');
    useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => window.clearTimeout(timer); }, [search]);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({ page: String(page), limit: '15', search: query, ...(role ? { role } : {}) });
                const [users, invites] = await Promise.all([apiRequest<{
                        data: Person[];
                        pagination: Pagination;
                    }>(`/api/workspace/people?${params}`, { signal: controller.signal }), apiRequest<{
                        data: Invitation[];
                    }>('/api/workspace/invitations', { signal: controller.signal })]);
                if (controller.signal.aborted)
                    return;
                if (page > Math.max(1, users.pagination.totalPages)) {
                    setPage(Math.max(1, users.pagination.totalPages));
                    return;
                }
                setPeople(users.data);
                setPagination(users.pagination);
                setInvitations(invites.data);
            }
            catch (err) {
                if (!controller.signal.aborted)
                    setError(messageFor(err));
            }
            finally {
                if (!controller.signal.aborted)
                    setLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [page, query, role, revision]);
    async function invite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setModalError('');
        const form = new FormData(event.currentTarget);
        try {
            const result = await apiRequest<{
                data: {
                    token: string;
                };
            }>('/api/workspace/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: String(form.get('name')).trim(), email: String(form.get('email')).trim(), role: String(form.get('role')) }) });
            const link = new URL(window.location.href);
            link.hash = `/accept-invite?token=${result.data.token}`;
            setInvitationLink(link.toString());
            setRevision(v => v + 1);
        }
        catch (err) {
            setModalError(messageFor(err));
        }
        finally {
            setBusy(false);
        }
    }
    async function savePerson(event: FormEvent) {
        event.preventDefault();
        if (!editing)
            return;
        setBusy(true);
        setModalError('');
        try {
            await apiRequest(`/api/workspace/people/${editing._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: editRole, isActive: editActive }) });
            setNotice(`Access updated for ${editing.name}.`);
            setEditing(null);
            setRevision(v => v + 1);
        }
        catch (err) {
            setModalError(messageFor(err));
        }
        finally {
            setBusy(false);
        }
    }
    async function revoke() {
        if (!revoking)
            return;
        setBusy(true);
        setModalError('');
        try {
            await apiRequest(`/api/workspace/invitations/${revoking._id}`, { method: 'DELETE' });
            setNotice('Invitation revoked. The old link can no longer be used.');
            setRevoking(null);
            setRevision(v => v + 1);
        }
        catch (err) {
            setModalError(messageFor(err));
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="people-panel"><div className="panel-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>People &amp; access</h1><p>Invite your team, manage roles, and keep the right people connected.</p></div><button className="button button-primary" onClick={() => { setShowInvite(true); setInvitationLink(''); setModalError(''); }}>+ Invite a person</button></div>
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    <div className="people-toolbar"><div><label htmlFor="people-search">Search people</label><input className="field" id="people-search" type="search" maxLength={100} placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)}/></div><div><label htmlFor="people-role">Role</label><select className="field" id="people-role" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div><button className="button button-secondary" onClick={() => setRevision(v => v + 1)} disabled={loading}>Refresh</button></div>
    {loading ? <div className="ticket-state" role="status">Loading your people...</div> : error ? <div className="alert alert-error" role="alert">{error}<button className="text-button" onClick={() => setRevision(v => v + 1)}>Try again</button></div> : <><div className="people-table-wrap"><table className="people-table"><caption>{pagination?.total || 0} people in this workspace</caption><thead><tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Access</th></tr></thead><tbody>{people.map(person => <tr key={person._id}><td><strong>{person.name}{person._id === user.id ? ' (you)' : ''}</strong><small>{person.email}</small></td><td><span className="role-chip">{roleLabels[person.role]}</span></td><td><span className={person.isActive ? 'person-active' : 'person-inactive'}>{person.isActive ? 'Active' : 'Disabled'}</span></td><td>{person.role === 'Admin' ? <span className="field-help">Protected admin</span> : <button className="text-button" onClick={() => { setEditing(person); setEditRole(person.role); setEditActive(person.isActive); setModalError(''); }} aria-label={`Manage access for ${person.name}`}>Manage access</button>}</td></tr>)}</tbody></table>{people.length === 0 && <div className="panel-empty"><h3>No matching people</h3><p>Try another search or select a different role.</p></div>}</div>{pagination && <nav className="people-pagination" aria-label="People pages"><button className="button button-secondary" disabled={!pagination.hasPreviousPage} onClick={() => setPage(v => v - 1)}>Previous</button><span>Page {pagination.totalPages ? pagination.page : 0} of {pagination.totalPages}</span><button className="button button-secondary" disabled={!pagination.hasNextPage} onClick={() => setPage(v => v + 1)}>Next</button></nav>}
      <section className="pending-invitations"><div className="panel-card-heading"><div><span className="eyebrow">READY TO JOIN</span><h2>Pending invitations</h2></div><span className="role-chip">{invitations.length} pending</span></div>{invitations.length === 0 ? <p className="field-help">No pending invitations. Invite a person to grow your team.</p> : invitations.map(invitation => <div className="invitation-row" key={invitation._id}><div><strong>{invitation.name}</strong><small>{invitation.email} &middot; {roleLabels[invitation.role]}</small></div><span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span><button className="ticket-delete-link" onClick={() => { setRevoking(invitation); setModalError(''); }}>Revoke</button></div>)}</section></>}
    {showInvite && <Modal titleId="invite-title" busy={busy} onClose={() => setShowInvite(false)}><div className="modal-header"><div><span>TEAM ACCESS</span><h2 id="invite-title">{invitationLink ? 'Invitation ready' : 'Invite a person'}</h2></div><button className="close-button" aria-label="Close invitation" disabled={busy} onClick={() => setShowInvite(false)}>&times;</button></div>{modalError && <div className="alert alert-error" role="alert">{modalError}</div>}{invitationLink ? <><p className="detail-description">Share this private, one-time link with the intended recipient through your trusted channel. They will choose their own password. The link expires in 7 days.</p><label htmlFor="invitation-link">Private invitation link</label><textarea className="field invitation-link" id="invitation-link" readOnly value={invitationLink} onFocus={e => e.target.select()}/><p className="field-help">This link is shown only now. To replace a lost link, invite the same email again; the previous link becomes invalid. No email has been sent automatically.</p><div className="form-actions"><button className="button button-secondary" onClick={async () => { try {
        await navigator.clipboard.writeText(invitationLink);
        setNotice('Invitation link copied.');
    }
    catch {
        setModalError('Select the link above and copy it manually.');
    } }}>Copy link</button><button className="button button-primary" onClick={() => setShowInvite(false)}>Done</button></div></> : <form onSubmit={invite}><fieldset disabled={busy}><div className="form-group"><label htmlFor="invite-name">Full name</label><input className="field" id="invite-name" name="name" autoComplete="name" required minLength={2} maxLength={80}/></div><div className="form-group"><label htmlFor="invite-email">Email address</label><input className="field" id="invite-email" name="email" type="email" autoComplete="email" required/></div><div className="form-group"><label htmlFor="invite-role">Workspace role</label><select className="field" id="invite-role" name="role" defaultValue="SupportAgent">{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><small className="field-help">Administrators can manage every ticket and invite other people. Grant this role only to trusted workspace owners.</small></div><button className="button button-primary" type="submit">{busy ? 'Creating...' : 'Create invitation'}</button></fieldset></form>}</Modal>}
    {editing && <Modal titleId="access-title" busy={busy} onClose={() => setEditing(null)}><div className="modal-header"><div><span>MANAGE ACCESS</span><h2 id="access-title">{editing.name}</h2></div><button className="close-button" aria-label="Close access editor" disabled={busy} onClick={() => setEditing(null)}>&times;</button></div>{modalError && <div className="alert alert-error" role="alert">{modalError}</div>}<form onSubmit={savePerson}><fieldset disabled={busy}><p className="detail-description">{editing.email}</p><div className="form-group"><label htmlFor="edit-person-role">Role</label><select className="field" id="edit-person-role" value={editRole} onChange={e => setEditRole(e.target.value)}><option value="Customer">Customer</option><option value="SupportAgent">Support agent</option></select></div><label className="checkbox-label"><input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)}/> Account is active</label><p className="field-help">Changes take effect on their next API request. Refresh sessions are revoked. Review and reassign any open work before disabling an agent or changing their role.</p><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" type="submit">{busy ? 'Saving...' : 'Save access'}</button></div></fieldset></form></Modal>}
    {revoking && <Modal titleId="revoke-title" busy={busy} onClose={() => setRevoking(null)}><div className="modal-header"><h2 id="revoke-title">Revoke invitation?</h2></div>{modalError && <div className="alert alert-error" role="alert">{modalError}</div>}<p className="detail-description">The link for {revoking.email} will stop working. You can create a new invitation later.</p><div className="form-actions"><button className="button button-secondary" disabled={busy} onClick={() => setRevoking(null)}>Keep invitation</button><button className="button button-danger" disabled={busy} onClick={() => void revoke()}>{busy ? 'Revoking...' : 'Revoke invitation'}</button></div></Modal>}
  </section>;
}
