import { useEffect, useState } from "react";
import type { Ticket } from "../types/ticket";

interface TicketDetailsProps {
  ticketId: string | null;
  onClose: () => void;
}

interface TicketResponse {
  success: boolean;
  message: string;
  data: Ticket;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function TicketDetails({ ticketId, onClose }: TicketDetailsProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/tickets/${ticketId}`);

        const result: TicketResponse = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch ticket");
        }

        setTicket(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

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

        {!loading && !error && ticket && (
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
                <span className="detail-label">Status</span>

                <strong>{ticket.status || "Open"}</strong>
              </div>

              <div>
                <span className="detail-label">Created</span>

                <strong>{new Date(ticket.createdAt).toLocaleString()}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TicketDetails;
