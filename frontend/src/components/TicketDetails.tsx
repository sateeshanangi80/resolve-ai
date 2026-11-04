import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "../api";
import Modal from "./Modal";
import type { Ticket } from "../types/ticket";

interface TicketDetailsProps {
  ticketId: string | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

interface TicketResponse {
  success: boolean;
  message: string;
  data: Ticket;
}

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

function TicketDetails({
  ticketId,
  onClose,
  onUpdated,
  onDeleted,
}: TicketDetailsProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [status, setStatus] = useState<TicketStatus>("Open");

  const [deleting, setDeleting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!ticketId) return;
    const controller = new AbortController();

    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const result = await apiRequest<TicketResponse>(`/api/tickets/${ticketId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;

        setTicket(result.data);

        setStatus((result.data.status || "Open") as TicketStatus);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchTicket();
    return () => controller.abort();
  }, [ticketId]);

  const handleUpdateStatus = async () => {
    if (!ticketId) return;

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const result = await apiRequest<TicketResponse>(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      // Update modal with latest ticket
      setTicket(result.data);

      setSuccess("Ticket status updated successfully");

      // Refresh GET /api/tickets in parent
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError && err.issues.length ? err.issues.map(issue => issue.message).join(' ') : err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketId) return;

    try {
      setDeleting(true);
      setError("");

      await apiRequest(`/api/tickets/${ticketId}`, {
        method: "DELETE",
      });

      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  if (!ticketId) {
    return null;
  }

  return (
    <Modal titleId="ticket-details-title" onClose={onClose} busy={updating || deleting} wide className="ticket-details-modal">
      <div className="modal-header">
        <div className="ticket-details-heading">
          <span>{ticket ? `TICKET #${ticket._id.slice(-6).toUpperCase()}` : 'TICKET DETAILS'}</span>
          <h2 id="ticket-details-title">{ticket?.title || 'Support ticket'}</h2>
        </div>
        <button type="button" className="close-button" aria-label="Close ticket details" disabled={updating || deleting} onClick={onClose}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      {loading && <p role="status">Loading ticket...</p>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {!loading && ticket && (
        <>
          <div className="ticket-details-meta">
            <span className="ticket-category">{ticket.category}</span>
            <span className={`ticket-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority} priority</span>
            <time dateTime={ticket.createdAt} title={new Date(ticket.createdAt).toLocaleString()}>
              Created {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </time>
          </div>

          <div className="ticket-details-description">
            <span className="detail-label" id="ticket-description-label">Description</span>
            <div className="ticket-description-scroll" tabIndex={0} role="region" aria-labelledby="ticket-description-label">
              <p>{ticket.description}</p>
            </div>
          </div>

          <div className="ticket-details-status">
            <label htmlFor="detail-status">Status</label>
            <select id="detail-status" className="field" disabled={updating || deleting || showDeleteConfirm}
              value={status} onChange={event => { setStatus(event.target.value as TicketStatus); setSuccess(''); }}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <button type="button" className="button button-primary" onClick={handleUpdateStatus}
              disabled={updating || deleting || showDeleteConfirm || status === (ticket.status || 'Open')}>
              {updating ? 'Saving...' : 'Save status'}
            </button>
          </div>

          <div className="ticket-details-footer">
            {showDeleteConfirm ? (
              <div className="ticket-delete-confirm" role="group" aria-label="Confirm ticket deletion">
                <p>Delete this ticket permanently?</p>
                <div>
                  <button type="button" className="button button-secondary" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>Keep ticket</button>
                  <button type="button" className="button button-danger" disabled={deleting || updating} onClick={handleDeleteTicket}>{deleting ? 'Deleting...' : 'Delete ticket'}</button>
                </div>
              </div>
            ) : (
              <>
                <button type="button" className="ticket-delete-link" disabled={updating || deleting} onClick={() => { setShowDeleteConfirm(true); setSuccess(''); }}>Delete ticket</button>
                <button type="button" className="button button-secondary" disabled={updating || deleting} onClick={onClose}>Done</button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

export default TicketDetails;
