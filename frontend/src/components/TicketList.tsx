import { useEffect, useState } from 'react'
import type { Ticket } from '../types/ticket'

interface TicketResponse {
    success: boolean
    count: number
    data: Ticket[]
}

const fallbackTickets: Ticket[] = [
    {
        _id: 'static-101',
        title: 'Payment deducted but plan inactive',
        description:
            'Customer reports that a payment was deducted but the plan remains inactive. Please verify billing status and restore access if needed.',
        category: 'Billing',
        priority: 'High',
        status: 'Open',
        createdAt: '2026-09-20T09:30:00.000Z',
        updatedAt: '2026-09-20T09:30:00.000Z',
    },
    {
        _id: 'static-102',
        title: 'Login loop on mobile app',
        description:
            'Users are repeatedly redirected to the login screen after authentication. Needs a review of app tokens and session refresh logic.',
        category: 'Authentication',
        priority: 'Medium',
        status: 'In Review',
        createdAt: '2026-09-21T11:10:00.000Z',
        updatedAt: '2026-09-21T11:10:00.000Z',
    },
    {
        _id: 'static-103',
        title: 'Dashboard charts not loading',
        description:
            'Analytics charts fail to render for some customers after an update. Please inspect recent data fetch changes and cached responses.',
        category: 'Analytics',
        priority: 'Low',
        status: 'Monitoring',
        createdAt: '2026-09-23T15:40:00.000Z',
        updatedAt: '2026-09-23T15:40:00.000Z',
    },
]

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
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

    const displayTickets = tickets.length > 0 ? tickets : fallbackTickets

    return (
        <section className="ticket-section">
            <div className="ticket-heading">
                <div>
                    <span>LIVE DATA</span>
                    <h2>Recent Support Tickets</h2>
                </div>

                <div className="ticket-heading-meta">
                    <strong>{displayTickets.length} tickets</strong>
                    {error && <small className="ticket-status-note">Showing sample data while live data syncs.</small>}
                </div>
            </div>

            {loading && !tickets.length ? (
                <div className="ticket-loading">Loading tickets...</div>
            ) : null}

            <div className="ticket-grid">
                {displayTickets.map((ticket) => (
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
        </section>
    )
}

export default TicketList