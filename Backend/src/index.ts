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
const FRONTEND_ORIGIN_RAW = process.env.FRONTEND_ORIGIN || '*'
// support comma-separated origins in env: "http://localhost:5173,https://app.vercel.app"
const FRONTEND_ORIGINS = FRONTEND_ORIGIN_RAW.split(',').map((s) => s.trim()).filter(Boolean)

// Build a robust CORS config: accept the origin if it matches the configured list,
// otherwise reject. This allows multiple origins (localhost + Vercel) and provides
// useful logs when an origin is blocked.
// Also support a FRONTEND_DEV env var (single or comma-separated) that will be
// automatically appended to the allowed origins at runtime when present.
const allowedOrigins = [...FRONTEND_ORIGINS]
const frontendDevRaw = process.env.FRONTEND_DEV || ''
if (frontendDevRaw) {
  const devOrigins = frontendDevRaw.split(',').map((s) => s.trim()).filter(Boolean)
  for (const o of devOrigins) {
    if (!allowedOrigins.includes(o)) allowedOrigins.push(o)
  }
}

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // If no origin (e.g. server-to-server or same-origin), allow
    if (!origin) return callback(null, true)
    // If wildcard present, allow everything
    if (allowedOrigins.includes('*')) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(',')}`)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
// also ensure preflight requests are answered
app.options('*', cors(corsOptions))

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
