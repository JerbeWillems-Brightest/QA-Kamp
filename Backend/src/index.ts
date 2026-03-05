import express = require('express')
import cors = require('cors')
import type { Request, Response, NextFunction } from 'express'
import { connectDB } from './db'
import itemsRouter from './routes/items'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

// Allow the frontend origin via env var, default to local dev
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

app.use(express.json())

// Ensure MongoDB is connected before handling any request
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  await connectDB()
  next()
})

app.get('/api/status', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from backend', time: new Date().toISOString() })
})

// Items CRUD routes (MongoDB)
app.use('/api/items', itemsRouter)

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT} — CORS origin: ${FRONTEND_ORIGIN}`)
  })
}

// Export for Vercel serverless
export default app
