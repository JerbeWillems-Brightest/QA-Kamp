import mongoose from 'mongoose'
import { Organizer } from './models/Organizer'

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://QA-KampAdmin:BrightestQaKamp@qa-kamp.4vsjlqg.mongodb.net/qa-kamp?retryWrites=true&w=majority'

let cached: Promise<typeof mongoose> | null = null

export async function connectDB(): Promise<void> {
  // If already connected, skip
  if (mongoose.connection.readyState >= 1) return

  if (!cached) {
    console.log('Connecting to MongoDB...', MONGO_URI.replace(/\/\/.*@/, '//<credentials>@'))
    cached = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
    }).then((m) => {
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

export async function seedOrganizers() {
  try {
    // create a default organizer for testing if none exists
    const count = await Organizer.countDocuments()
    if (count === 0) {
      console.log('Seeding default organizer...')
      // Use the organizer credentials requested by the user for easy testing
      await Organizer.create({ email: 'organizer@qa-kamp.be', password: 'Organizer123!', name: 'Organizer' })
      console.log('Default organizer created: organizer@qa-kamp.be / Organizer123!')
    } else {
      console.log('Organizers already exist, skipping seed')
    }
  } catch (err) {
    console.error('Seeding organizers failed:', err)
  }
}
