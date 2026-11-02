import { useEffect, useState } from "react";
import { API_URL } from "../api";
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

    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const response = await fetch(`${API_URL}/api/tickets/${ticketId}`);

        const result: TicketResponse = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch ticket");
        }

        setTicket(result.data);

        setStatus((result.data.status || "Open") as TicketStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  const handleUpdateStatus = async () => {
    if (!ticketId) return;

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const result: TicketResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update ticket");
      }

      // Update modal with latest ticket
      setTicket(result.data);

      setSuccess("Ticket status updated successfully");

      // Refresh GET /api/tickets in parent
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketId) return;

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete ticket");
      }

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
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="modal-header">
          <div>
            <span>TICKET DETAILS</span>
            <h2>Support Ticket</h2>
          </div>

          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && <p>Loading ticket...</p>}

        {error && <div className="alert alert-error">{error}</div>}

        {success && <div className="alert alert-success">{success}</div>}

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
                  disabled={updating || status === (ticket.status || "Open")}
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
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="button button-danger"
                        onClick={handleDeleteTicket}
                        disabled={deleting}
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
      </div>
    </div>
  );
}

export default TicketDetails;
