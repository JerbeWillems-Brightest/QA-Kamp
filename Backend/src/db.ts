import mongoose from 'mongoose'
import { Organizer } from './models/Organizer'

// Prevent mongoose from automatically creating collections or indexes on model compile/startup.
// This helps avoid unexpected collections like 'items' being created implicitly during server start.
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://EnvVarUser:EnvVarPass@qa-kamp.4vsjlqg.mongodb.net/?appName=qa-kamp'

let cached: Promise<typeof mongoose> | null = null

export async function connectDB(): Promise<void> {
  // If already connected, skip
  if (mongoose.connection.readyState >= 1) return

  if (!cached) {

    console.log('Connecting to MongoDB...', MONGO_URI.replace(/\/\/.*@/, '//<credentials>@'))
    cached = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      // Allow Mongoose to buffer commands while the initial connection is being established.
      // This prevents race conditions where incoming HTTP requests trigger DB ops before
      // the initial connect has completed (which previously threw when bufferCommands=false).
      bufferCommands: true,
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

      // Read credentials from environment variables to avoid committing plaintext passwords
      const o1Email = process.env.ORGANIZER1_EMAIL
      const o1Password = process.env.ORGANIZER1_PASSWORD
      const o2Email = process.env.ORGANIZER2_EMAIL
      const o2Password = process.env.ORGANIZER2_PASSWORD

      // If no env vars provided, allow fallback for test/local environments so unit tests can seed.
      // Historically CI/GITHUB_ACTIONS were also considered, but that could cause unexpected seeding
      // when NODE_ENV is 'production' while CI flags are present in the outer environment. Only
      // allow CI-driven fallback when NODE_ENV is not explicitly 'production'. This keeps the
      // behaviour deterministic for tests which set NODE_ENV to 'production' to simulate a
      // non-test remote environment.
      // (runningInTestOrCi was previously used; logic below explicitly checks NODE_ENV and CI flags)
      const mongoUri = process.env.MONGO_URI || ''
      const runningOnLocalMongo = /127\.0\.0\.1|localhost/.test(mongoUri)

      // Only allow CI/GITHUB_ACTIONS to enable fallback when NODE_ENV is not 'production'.
      const ciAllowed = (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') && process.env.NODE_ENV !== 'production'
      const shouldUseFallback = !o1Email && !o2Email && ((process.env.NODE_ENV === 'test') || runningOnLocalMongo || ciAllowed)
      if (shouldUseFallback) {
        console.log('No ORGANIZER env vars found — using test fallback credentials for seeding (test/CI/local)')
      }

      let created = 0
      if ((o1Email && o1Password) || shouldUseFallback) {
        const email = (o1Email && o1Password) ? o1Email : ''
        const password = (o1Email && o1Password) ? o1Password : ''
        await Organizer.create({ email, password, name: 'Organizer' })
        console.log(`Created real organizer`)
        created++
      }
      if ((o2Email && o2Password) || shouldUseFallback) {
        const email = (o2Email && o2Password) ? o2Email : ''
        const password = (o2Email && o2Password) ? o2Password : ''
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
