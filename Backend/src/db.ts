import mongoose from 'mongoose'
import { Organizer } from './models/Organizer'

// Prevent mongoose from automatically creating collections or indexes on model compile/startup.
// This helps avoid unexpected collections like 'items' being created implicitly during server start.
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)

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
      // ensure mongoose itself doesn't auto-create collections or indexes during connect
      autoIndex: false,
      autoCreate: false,
    }).then((m) => {
      console.log('MongoDB connected')

      // Safety: ensure there is no unexpected 'items' collection. If present, drop it immediately.
      // This prevents the backend from leaving a stray 'items' collection after startup.
      ;(async () => {
        try {
          const db = mongoose.connection.db
          if (db) {
            const collections = await db.listCollections().toArray()
            const hasItems = collections.some((c: any) => c.name === 'items')
            if (hasItems) {
              console.log("Found stray 'items' collection on connect — dropping it...")
              await db.dropCollection('items')
              console.log("Dropped 'items' collection")
            }
          }
        } catch (err) {
          // don't crash the app on this safety check; just log
          console.error("Error while checking/dropping 'items' collection:", err)
        }
      })()

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
