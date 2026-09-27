import Ticket from '../models/Ticket.js';
export const createTicket = async (req, res) => {
    try {
        console.log('REQ BODY:', req.body);
        if (!req.body) {
            res.status(400).json({
                success: false,
                message: 'Request body is required',
            });
            return;
        }
        const { title, description, category, priority, } = req.body;
        if (!title || !description) {
            res.status(400).json({
                success: false,
                message: 'Title and description are required',
            });
            return;
        }
        const ticket = await Ticket.create({
            title,
            description,
            category,
            priority,
        });
        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: ticket,
        });
    }
    catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
//# sourceMappingURL=ticket.controller.js.map