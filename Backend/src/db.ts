import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://QA-KampAdmin:BrightestQaKamp@qa-kamp.4vsjlqg.mongodb.net/qa-kamp?retryWrites=true&w=majority'

let cached: Promise<typeof mongoose> | null = null

export async function connectDB(): Promise<void> {
  // If already connected or connecting, reuse the promise
  if (mongoose.connection.readyState >= 1) return
  if (!cached) {
    cached = mongoose.connect(MONGO_URI).then((m) => {
      console.log('MongoDB connected')
      return m
    })
  }
  await cached
}
