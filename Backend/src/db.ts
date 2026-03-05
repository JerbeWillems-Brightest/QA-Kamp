import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://QA-KampAdmin:BrightestQaKamp@qa-kamp.4vsjlqg.mongodb.net/qa-kamp?retryWrites=true&w=majority'

let cached: Promise<typeof mongoose> | null = null

export async function connectDB(): Promise<void> {
  // If already connected, skip
  if (mongoose.connection.readyState >= 1) return

  if (!cached) {
    console.log('Connecting to MongoDB...')
    cached = mongoose.connect(MONGO_URI).then((m) => {
      console.log('MongoDB connected')
      return m
    }).catch((err) => {
      // Reset cache so the next invocation retries
      console.error('MongoDB connection error:', err)
      cached = null
      throw err
    })
  }

  await cached
}
