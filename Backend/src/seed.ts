import dotenv from 'dotenv'
dotenv.config()

import { connectDB, seedOrganizers } from './db'

async function run() {
  try {
    await connectDB()
    await seedOrganizers()
    console.log('Seeding finished')
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  }
}

run()

