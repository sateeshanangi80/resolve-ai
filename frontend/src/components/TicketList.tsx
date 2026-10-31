import { useCallback, useEffect, useState } from 'react'
import type { Ticket } from '../types/ticket'
import CreateTicket from './CreateTicket'

interface TicketResponse {
  success: boolean
  count: number
  data: Ticket[]
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000'

function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/api/tickets`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }

      const result: TicketResponse =
        await response.json()

      setTickets(result.data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return (
    <section className="ticket-section">
      <div className="ticket-heading">
        <div>
          <span>LIVE DATA</span>
          <h2>Recent Support Tickets</h2>
        </div>

        <div className="ticket-heading-actions">
          <strong>
            {tickets.length}{' '}
            {tickets.length === 1
              ? 'ticket'
              : 'tickets'}
          </strong>

          <CreateTicket onCreated={fetchTickets} />
        </div>
      </div>

      {loading && (
        <p>Loading tickets...</p>
      )}

      {error && (
        <p className="ticket-error">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="ticket-grid">
          {tickets.map((ticket) => (
            <article
              className="ticket-item"
              key={ticket._id}
            >
              <div className="ticket-item-header">
                <span>{ticket.category}</span>

                <strong
                  className={`ticket-priority ${ticket.priority.toLowerCase()}`}
                >
                  {ticket.priority}
                </strong>
              </div>

              <h3>{ticket.title}</h3>

              <p>{ticket.description}</p>

              <div className="ticket-meta">
                <span>
                  #{ticket._id
                    .slice(-6)
                    .toUpperCase()}
                </span>

                <span>
                  {new Date(
                    ticket.createdAt
                  ).toLocaleDateString()}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default TicketList
