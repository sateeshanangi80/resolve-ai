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
    <Modal titleId="ticket-details-title" onClose={onClose} busy={updating || deleting} wide>
        <div className="modal-header">
          <div>
            <span>TICKET DETAILS</span>
            <h2 id="ticket-details-title">Support Ticket</h2>
          </div>

          <button type="button" className="close-button" aria-label="Close ticket details" disabled={updating || deleting} onClick={onClose}>
            ×
          </button>
        </div>

        {loading && <p>Loading ticket...</p>}

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {success && <div className="alert alert-success" role="status">{success}</div>}

        {!loading && ticket && (
          <>
            <div className="ticket-detail-top">
              <div>
                <span className="detail-label">Ticket ID</span>

                <strong>#{ticket._id.slice(-6).toUpperCase()}</strong>
              </div>

              <span
                className={`ticket-priority ${ticket.priority.toLowerCase()}`}
              >
                {ticket.priority}
              </span>
            </div>

            <div className="detail-block">
              <span className="detail-label">Title</span>

              <h3>{ticket.title}</h3>
            </div>

            <div className="detail-block">
              <span className="detail-label">Description</span>

              <p>{ticket.description}</p>
            </div>

            <div className="ticket-detail-grid">
              <div>
                <span className="detail-label">Category</span>

                <strong>{ticket.category}</strong>
              </div>

              <div>
                <span className="detail-label">Priority</span>

                <strong>{ticket.priority}</strong>
              </div>

              <div>
                <span className="detail-label">Current Status</span>

                <strong>{ticket.status || "Open"}</strong>
              </div>

              <div>
                <span className="detail-label">Created</span>

                <strong>{new Date(ticket.createdAt).toLocaleString()}</strong>
              </div>
            </div>

            <div className="ticket-update-section">
              <div>
                <span className="detail-label">Update Status</span>

                <p>Change the current support ticket status.</p>
              </div>

              <div className="ticket-update-controls">
                <select className="field"
                  aria-label="Ticket status" disabled={updating || deleting}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                >
                  <option value="Open">Open</option>

                  <option value="In Progress">In Progress</option>

                  <option value="Resolved">Resolved</option>

                  <option value="Closed">Closed</option>
                </select>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleUpdateStatus}
                  disabled={updating || deleting || status === (ticket.status || "Open")}
                >
                  {updating ? "Updating..." : "Update Ticket"}
                </button>
              </div>
              <div className="ticket-danger-zone">
                <div>
                  <span className="detail-label">Delete Ticket</span>

                  <p>Permanently remove this support ticket.</p>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={updating || deleting}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Ticket
                  </button>
                ) : (
                  <div className="delete-confirmation">
                    <span>Are you sure you want to delete this ticket?</span>

                    <div>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={deleting}
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="button button-danger"
                        onClick={handleDeleteTicket}
                        disabled={deleting || updating}
                      >
                        {deleting ? "Deleting..." : "Yes, Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
    </Modal>
  );
}

export default TicketDetails;
