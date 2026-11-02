import { API_URL } from "../api";
import { useEffect, useState } from "react";
import type { Ticket } from "../types/ticket";

interface TicketDetailsProps {
  ticketId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

interface TicketResponse {
  success: boolean;
  message: string;
  data: Ticket;
}

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";



function TicketDetails({ ticketId, onClose, onUpdated }: TicketDetailsProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [status, setStatus] = useState<TicketStatus>("Open");

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

  if (!ticketId) {
    return null;
  }

  return (
    <div className="ticket-modal-overlay">
      <div className="ticket-details-modal">
        <div className="ticket-modal-header">
          <div>
            <span>TICKET DETAILS</span>
            <h2>Support Ticket</h2>
          </div>

          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading && <p>Loading ticket...</p>}

        {error && <div className="form-error">{error}</div>}

        {success && <div className="form-success">{success}</div>}

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
                <select
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
                  className="update-ticket-button"
                  onClick={handleUpdateStatus}
                  disabled={updating || status === (ticket.status || "Open")}
                >
                  {updating ? "Updating..." : "Update Ticket"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TicketDetails;
