import { useEffect, useState } from 'react'
import type { Ticket } from '../types/ticket'

interface TicketResponse {
    success: boolean
    count: number
    data: Ticket[]
}

const API_URL = (import.meta.env.VITE_API_URL)
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '')

function TicketList() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true)

                const response = await fetch(`${API_URL}/api/tickets`)

                if (!response.ok) {
                    throw new Error('Failed to fetch tickets')
                }

                const result: TicketResponse = await response.json()

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
        }

        fetchTickets()
    }, [])

    return (
        <section className="ticket-section">
            <div className="ticket-heading">
                <div>
                    <span>LIVE DATA</span>
                    <h2>Recent Support Tickets</h2>
                </div>

                <div className="ticket-heading-meta">
                    <strong>{tickets.length} tickets</strong>
                    {error ? <small className="ticket-status-note">Unable to load live tickets right now.</small> : null}
                </div>
            </div>

            {loading && !tickets.length ? (
                <div className="ticket-loading">Loading tickets...</div>
            ) : null}

            {!loading && !error && tickets.length === 0 ? (
                <div className="ticket-empty">No live tickets available.</div>
            ) : null}

            {!error && tickets.length > 0 ? (
                <div className="ticket-grid">
                    {tickets.map((ticket) => (
                        <article className="ticket-item" key={ticket._id}>
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
                                    #{ticket._id.slice(-6).toUpperCase()}
                                </span>

                                <span>
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            ) : null}
        </section>
    )
}

export default TicketList