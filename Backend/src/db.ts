import mongoose from 'mongoose'
import { Organizer } from './models/Organizer'

mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://EnvVarUser:EnvVarPass@qa-kamp.4vsjlqg.mongodb.net/?appName=qa-kamp'

let cached: Promise<typeof mongoose> | null = null

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return

  if (!cached) {

    console.log('Connecting to MongoDB...', MONGO_URI.replace(/\/\/.*@/, '//<credentials>@'))
    cached = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      bufferCommands: true,
      autoIndex: false,
      autoCreate: false,
    }).then((m) => {
      console.log('MongoDB connected')

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
          console.error("Error while checking/dropping 'items' collection:", err)
        }
      })()

      return m
    }).catch((err) => {
      console.error('MongoDB connection error:', err)
      cached = null
      throw err
    })
  }

  await cached
}

export async function seedOrganizers() {
  try {
    const count = await Organizer.countDocuments()
    if (count === 0) {
      console.log('Seeding default organizer...')

      const o1Email = process.env.ORGANIZER1_EMAIL
      const o1Password = process.env.ORGANIZER1_PASSWORD
      const o2Email = process.env.ORGANIZER2_EMAIL
      const o2Password = process.env.ORGANIZER2_PASSWORD

      const mongoUri = process.env.MONGO_URI || ''
      const runningOnLocalMongo = /127\.0\.0\.1|localhost/.test(mongoUri)
      const ciAllowed = (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') && process.env.NODE_ENV !== 'production'
      const shouldUseFallback = !o1Email && !o2Email && ((process.env.NODE_ENV === 'test') || runningOnLocalMongo || ciAllowed)
      if (shouldUseFallback) {
        console.log('No ORGANIZER env vars found — using test fallback credentials for seeding (test/CI/local)')
      }

      let created = 0
      if ((o1Email && o1Password) || shouldUseFallback) {
        const email = (o1Email && o1Password) ? o1Email : 'organizer1@example.test'
        const password = (o1Email && o1Password) ? o1Password : 'test-password'
        await Organizer.create({ email, password, name: 'Organizer' })
        console.log(`Created real organizer`)
        created++
      }
      if ((o2Email && o2Password) || shouldUseFallback) {
        const email = (o2Email && o2Password) ? o2Email : 'organizer2@example.test'
        const password = (o2Email && o2Password) ? o2Password : 'test-password'
        await Organizer.create({ email, password, name: 'Organizer' })
        console.log(`Created test organizer`)
        created++
      }

      if (created === 0) {
        console.warn('No ORGANIZERx_EMAIL/PASSWORD env vars found — skipping seeding of default organizers.')
        console.warn('To seed organizers, set ORGANIZER1_EMAIL, ORGANIZER1_PASSWORD (and optionally ORGANIZER2_...) in your .env file.')
      }
    } else {
      console.log('Organizers already exist, skipping seed')
    }
  } catch (err) {
    console.error('Seeding organizers failed:', err)
  }
}
