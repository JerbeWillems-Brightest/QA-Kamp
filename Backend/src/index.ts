import express = require('express')
import cors = require('cors')
// Load environment variables from .env when running locally
import dotenv from 'dotenv'
dotenv.config()

import type { Request, Response, NextFunction } from 'express'
import { connectDB, seedOrganizers } from './db'
import usersRouter from './routes/users'
import authRouter from './routes/auth'
import sessionsRouter from './routes/sessions'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

// CORS: allow specific origin via env, or allow all origins on Vercel
// Read origins from env. FRONTEND_ORIGIN may contain comma-separated origins.
const FRONTEND_ORIGIN_RAW = process.env.FRONTEND_ORIGIN || '*'
const FRONTEND_ORIGINS = FRONTEND_ORIGIN_RAW.split(',').map((s) => s.trim()).filter(Boolean)

// Combine and deduplicate allowed origins (normalize by removing trailing slash and lowercasing)
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
    // No origin (curl, server-to-server) => allow
    if (!origin) return callback(null, true)
    // normalize incoming origin for robust matching
    const incoming = normalizeOrigin(origin)
    // Wildcard configured => allow everything
    if (allowedOrigins.includes('*')) return callback(null, true)
    if (allowedOrigins.includes(incoming)) return callback(null, true)
    console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(',')}`)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Allow common headers plus the custom x-confirm-delete header used by the frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-confirm-delete'],
  credentials: true,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
// Handle preflight (OPTIONS) safely for any path without registering a wildcard route
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return cors(corsOptions)(req as any, res as any, next as any)
  next()
})

app.use(express.json())

// Ensure MongoDB is connected before handling any request
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

// seed default organizers after DB connect (only when running server locally)
if (!process.env.VERCEL) {
  connectDB().then(() => seedOrganizers()).catch((err) => console.error('Seed error:', err))
}

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT} — CORS origin: ${FRONTEND_ORIGIN_RAW}`)
  })
}

// Export for Vercel serverless
export default app
