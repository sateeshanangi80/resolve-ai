import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { categories, priorities, statuses } from '../types/ticket';
import type { Pagination, Ticket } from '../types/ticket';
import CreateTicket from './CreateTicket';
import type { SessionUser } from '../App';
import TicketDetails from './TicketDetails';

const defaults = { search: '', status: '', priority: '', category: '', sortBy: 'createdAt', order: 'desc', limit: '9' };
interface TicketResponse { data: Ticket[]; pagination: Pagination }

export default function TicketList({ user, initialStatus = '', initialTicketId = null, initialAssignment = '' }: { user: SessionUser; initialStatus?: string; initialTicketId?: string | null; initialAssignment?: string }) {
  const [filters, setFilters] = useState({ ...defaults, status: statuses.includes(initialStatus as typeof statuses[number]) ? initialStatus : '', assignment: user.role === 'Admin' && initialAssignment === 'unassigned' ? 'unassigned' : '' });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<TicketResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId && /^[a-f0-9]{24}$/i.test(initialTicketId) ? initialTicketId : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters(previous => previous.search === searchInput.trim() ? previous : { ...previous, search: searchInput.trim() });
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      const params = new URLSearchParams({ page: String(page) });
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      try {
        const data = await apiRequest<TicketResponse>(`/api/tickets?${params}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.data) || !data.pagination) {
          throw new Error('This API is running an older ticket version. Update the backend or connect to your updated local server.');
        }
        if (page > Math.max(1, data.pagination.totalPages)) {
          setPage(Math.max(1, data.pagination.totalPages)); return;
        }
        setResult(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load tickets.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filters, page, revision]);

  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  const changeFilter = (key: keyof typeof filters, value: string) => {
    setFilters(previous => ({ ...previous, [key]: value })); setPage(1);
  };
  const active = Boolean(filters.search || filters.status || filters.priority || filters.category || filters.assignment);
  const tickets = result?.data ?? [];
  const pagination = result?.pagination;

  return <section className="ticket-section" id="tickets" aria-labelledby="tickets-heading">
    <div className="ticket-heading">
      <div><span className="section-label">YOUR SUPPORT, IN FOCUS</span><h2 id="tickets-heading">{user.role === 'Admin' ? 'All tickets' : user.role === 'SupportAgent' ? 'My queue' : 'My requests'}</h2><p className="ticket-subtitle">A clear view of what needs attention. A little less back and forth.</p></div>
      <div className="ticket-heading-actions"><button className="button button-secondary" onClick={refresh} disabled={loading}>↻ Refresh</button>{user.role !== 'SupportAgent' && <CreateTicket onCreated={() => { setPage(1); refresh(); }} />}</div>
    </div>
    <div className="queue-context"><div><strong>{user.role === 'Customer' ? 'Your requests, all in one place.' : user.role === 'SupportAgent' ? 'Your assigned support queue.' : 'The whole picture. One workspace.'}</strong><p>{user.role === 'Customer' ? 'Create a request and follow its progress through to resolution.' : user.role === 'SupportAgent' ? 'Review the details and update status as you make progress.' : 'Manage requests, assign support agents, and keep your team moving.'}</p></div><span>{user.role === 'Customer' ? 'Personal workspace' : user.role === 'SupportAgent' ? 'Assigned to you' : 'Team workspace'}</span></div>
    <div className="ticket-toolbar">
      <div className="ticket-search"><label htmlFor="ticket-search">Search tickets</label><input id="ticket-search" className="field" type="search" placeholder="Search title or description…" maxLength={100} value={searchInput} onChange={e => setSearchInput(e.target.value)} /></div>
      {([['status', 'Status', statuses], ['priority', 'Priority', priorities], ['category', 'Category', categories]] as const).map(([key, label, options]) => <div key={key}><label htmlFor={`filter-${key}`}>{label}</label><select id={`filter-${key}`} className="field" value={filters[key]} onChange={e => changeFilter(key, e.target.value)}><option value="">All</option>{options.map(option => <option key={option}>{option}</option>)}</select></div>)}
      <div><label htmlFor="ticket-sort">Sort by</label><select id="ticket-sort" className="field" value={`${filters.sortBy}:${filters.order}`} onChange={e => { const [sortBy, order] = e.target.value.split(':'); setFilters(previous => ({ ...previous, sortBy, order })); setPage(1); }}><option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="updatedAt:desc">Recently updated</option><option value="title:asc">Title A–Z</option><option value="title:desc">Title Z–A</option></select></div>
    </div>
    {user.role === 'Admin' && <div className="assignment-filter"><label htmlFor="assignment-filter">Assignment</label><select id="assignment-filter" className="field" value={filters.assignment} onChange={e=>changeFilter('assignment',e.target.value)}><option value="">All tickets</option><option value="unassigned">Awaiting assignment</option></select></div>}
    <div className="ticket-results-bar"><span role="status">{loading ? 'Loading tickets…' : error ? 'Tickets unavailable' : `${pagination?.total ?? 0} tickets${active ? ' matching your filters' : ' in your workspace'}`}</span>{active && <button className="view-ticket-button" onClick={() => { setFilters({ ...defaults, assignment: '' }); setSearchInput(''); setPage(1); }}>Clear filters</button>}</div>
    <div aria-busy={loading}>
      {loading && <div className="ticket-state">Loading your support queue…</div>}
      {!loading && error && <div className="ticket-state error" role="alert"><p>{error}</p><button className="button button-secondary" onClick={refresh}>Try again</button></div>}
      {!loading && !error && tickets.length === 0 && <div className="ticket-state"><h3>{active ? 'No matching tickets' : 'A clear queue starts here'}</h3><p>{active ? 'Try another search or clear your filters.' : user.role === 'SupportAgent' ? 'Tickets will appear here when an administrator assigns them to you.' : user.role === 'Admin' ? 'Customer requests appear here. Refresh the queue to check for new tickets.' : 'Create your first support ticket to get started.'}</p></div>}
      {!loading && !error && tickets.length > 0 && <div className="ticket-grid">{tickets.map(ticket => <article key={ticket._id} className="ticket-item">
        <div className="ticket-item-header"><span className="ticket-category">{ticket.category}</span><span className={`ticket-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></div>
        <h3>{ticket.title}</h3><p className="ticket-preview">{ticket.description}</p>
        <div className="ticket-summary-row"><div><span className="ticket-summary-label">Ticket ID</span><strong>#{ticket._id.slice(-6).toUpperCase()}</strong></div><div><span className="ticket-summary-label">Status</span><strong className={`ticket-status status-${(ticket.status || 'Open').toLowerCase().replaceAll(' ', '-')}`}>{ticket.status || 'Open'}</strong></div></div>
        <div className="ticket-assignee"><span className="ticket-summary-label">Assigned agent</span><strong>{typeof ticket.assignedTo === 'object' && ticket.assignedTo ? ticket.assignedTo.name : ticket.assignedTo ? 'Assigned' : 'Awaiting assignment'}</strong></div><div className="ticket-card-footer"><span>{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><button className="view-ticket-button" onClick={() => setSelectedId(ticket._id)} aria-label={`View ticket: ${ticket.title}`}>{user.role === 'Admin' ? 'Review & assign' : 'View details'} <span aria-hidden="true">→</span></button></div>
      </article>)}</div>}
    </div>
    {!error && pagination && <div className="ticket-pagination"><div className="page-size"><label htmlFor="page-size">Per page</label><select id="page-size" className="field" value={filters.limit} onChange={e => changeFilter('limit', e.target.value)}><option value="9">9</option><option value="18">18</option><option value="36">36</option></select></div><span>{pagination.total === 0 ? '0 results' : `${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`}</span><nav aria-label="Ticket pages"><button className="button button-secondary" disabled={loading || !pagination.hasPreviousPage} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {pagination.totalPages === 0 ? 0 : pagination.page} of {pagination.totalPages}</span><button className="button button-secondary" disabled={loading || !pagination.hasNextPage} onClick={() => setPage(value => value + 1)}>Next</button></nav></div>}
    {selectedId && <TicketDetails key={selectedId} ticketId={selectedId} user={user} onClose={() => setSelectedId(null)} onUpdated={refresh} onDeleted={refresh} />}
  </section>;
}
