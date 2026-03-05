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

app.get('/api/status', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from backend', time: new Date().toISOString() })
})

// Items CRUD routes (MongoDB)
app.use('/api/items', itemsRouter)

// Connect to MongoDB, then start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT} — CORS origin: ${FRONTEND_ORIGIN}`)
  })
})
