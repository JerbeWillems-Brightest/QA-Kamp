import express = require('express')
import cors = require('cors')
import dotenv from 'dotenv'
dotenv.config()

import type { Request, Response, NextFunction } from 'express'
import { connectDB, seedOrganizers } from './db'
import usersRouter from './routes/users'
import authRouter from './routes/auth'
import sessionsRouter from './routes/sessions'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

const FRONTEND_ORIGIN_RAW = process.env.FRONTEND_ORIGIN || '*'
const FRONTEND_ORIGINS = FRONTEND_ORIGIN_RAW.split(',').map((s) => s.trim()).filter(Boolean)

function normalizeOrigin(o: string) {
  if (!o) return ''
  return o.trim().replace(/\/+$/, '').toLowerCase()
}

const allowedOrigins = Array.from(
  new Set([
    ...FRONTEND_ORIGINS.map(normalizeOrigin).filter(Boolean),
  ])
)

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true)
    const incoming = normalizeOrigin(origin)
    if (allowedOrigins.includes('*')) return callback(null, true)
    if (allowedOrigins.includes(incoming)) return callback(null, true)
    console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(',')}`)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-confirm-delete'],
  credentials: true,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return cors(corsOptions)(req as any, res as any, next as any)
  next()
})

app.use(express.json())

app.use(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await connectDB()
    next()
  } catch (err) {
    console.error('MongoDB middleware error:', err)
    res.status(500).json({ error: 'Database connection failed' })
  }
})

// Users (organizers) routes
app.use('/api/users', usersRouter)

// Auth routes
app.use('/api/auth', authRouter)

// Sessions
app.use('/api/sessions', sessionsRouter)

if (!process.env.VERCEL) {
  connectDB().then(() => seedOrganizers()).catch((err) => console.error('Seed error:', err))
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT} — CORS origin: ${FRONTEND_ORIGIN_RAW}`)
  })
}

export default app
