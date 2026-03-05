import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://QA-KampAdmin:BrightestQaKamp@qa-kamp.4vsjlqg.mongodb.net/qa-kamp?retryWrites=true&w=majority'

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI)
    console.log(`MongoDB connected: ${MONGO_URI}`)
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}
