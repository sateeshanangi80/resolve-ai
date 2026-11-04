import express from 'express'
import cors from 'cors'
import ticketRoutes from './routes/ticket.routes.js'
import { notFound } from './middleware/notFound.middleware.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Resolve AI Backend is running successfully',
        service: 'Resolve AI Backend',
    })
})

app.use('/api/tickets', ticketRoutes)

/*
  IMPORTANT:
  These must come AFTER all routes
*/


app.use(notFound)

app.use(errorHandler)


export default app
