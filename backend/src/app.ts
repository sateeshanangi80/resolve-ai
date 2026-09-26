import express from 'express'
import cors from 'cors'


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

export default app
