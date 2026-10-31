import { useCallback, useEffect, useState } from "react";
import type { Ticket } from "../types/ticket";
import CreateTicket from "./CreateTicket";
import TicketDetails from "./TicketDetails";

interface TicketResponse {
  success: boolean;
  count: number;
  data: Ticket[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/tickets`);

      const result: TicketResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }

      setTickets(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <>
      <section className="ticket-section">
        <div className="ticket-heading">
          <div>
            <span className="section-label">LIVE DATA</span>

            <h2>Recent Support Tickets</h2>

            <p className="ticket-subtitle">
              Track and manage customer support requests.
            </p>
          </div>

          <div className="ticket-heading-actions">
            <strong className="ticket-count">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </strong>

            <CreateTicket onCreated={fetchTickets} />
          </div>
        </div>

        {loading && <div className="ticket-state">Loading tickets...</div>}

        {error && <div className="ticket-state error">{error}</div>}

        {!loading && !error && tickets.length === 0 && (
          <div className="ticket-state">No tickets found.</div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="ticket-grid">
            {tickets.map((ticket) => (
              <article key={ticket._id} className="ticket-item">
                <div className="ticket-item-header">
                  <span className="ticket-category">{ticket.category}</span>

                  <span
                    className={`ticket-priority ${ticket.priority.toLowerCase()}`}
                  >
                    {ticket.priority}
                  </span>
                </div>

                <h3>{ticket.title}</h3>

                <div className="ticket-summary-row">
                  <div>
                    <span className="ticket-summary-label">Ticket ID</span>

                    <strong>#{ticket._id.slice(-6).toUpperCase()}</strong>
                  </div>

                  <div>
                    <span className="ticket-summary-label">Status</span>

                    <strong className="ticket-status">
                      {ticket.status || "Open"}
                    </strong>
                  </div>
                </div>

                <div className="ticket-card-footer">
                  <span>
                    {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <button
                    type="button"
                    className="view-ticket-button"
                    onClick={() => setSelectedTicketId(ticket._id)}
                  >
                    View Details
                    <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <TicketDetails
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </>
  );
}

export default TicketList;
