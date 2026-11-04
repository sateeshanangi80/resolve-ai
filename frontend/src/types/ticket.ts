export const categories = ['General', 'Billing', 'Technical', 'Account', 'Subscription'] as const;
export const priorities = ['Low', 'Medium', 'High'] as const;
export const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = typeof statuses[number];
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface Ticket {
    _id: string
    title: string
    description: string
    category: string
    priority: typeof priorities[number]
    status?: TicketStatus
    createdAt: string
    updatedAt: string
}
