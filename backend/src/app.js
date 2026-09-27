import express from 'express';
import cors from 'cors';
import ticketRoutes from './routes/ticket.routes.js';
const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Resolve AI Backend is running successfully',
        service: 'Resolve AI Backend',
    });
});
app.use('/api/tickets', ticketRoutes);
export default app;
//# sourceMappingURL=app.js.map