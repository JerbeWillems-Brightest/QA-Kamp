import express from 'express'
import { connectDB } from './db'
import itemsRouter from './routes/items'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

// Simple, small CORS middleware to avoid requiring the 'cors' package
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(express.json())

app.get('/api/status', (_req, res) => {
  res.json({ message: 'Hello from backend', time: new Date().toISOString() })
})

// Items CRUD routes
app.use('/api/items', itemsRouter)

// Connect to MongoDB, then start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`)
  })
})
