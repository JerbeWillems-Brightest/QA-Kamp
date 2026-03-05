import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/qa-kamp'

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI)
    console.log(`MongoDB connected: ${MONGO_URI}`)
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}
