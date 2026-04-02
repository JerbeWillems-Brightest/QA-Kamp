const { expect } = require('chai')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

describe('DB module (compiled)', function() {
  let mongod

  before(async function() {
    this.timeout(20000)
    mongod = await MongoMemoryServer.create()
    process.env.MONGO_URI = mongod.getUri()
    process.env.VERCEL = '1'
  })

  after(async function() {
    // ensure mongoose is disconnected and stop mongod
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
  })

  it('connectDB connects and seedOrganizers creates organizer', async function() {
    this.timeout(20000)
    // Clear require cache for dist/db.js so we get a fresh module (avoids reused `cached` connection between tests)
    const dbPath = path.join(process.cwd(), 'dist', 'db.js')
    delete require.cache[require.resolve(dbPath)]
    const db = require(dbPath)

    // connectDB should connect successfully
    await db.connectDB()

    // seedOrganizers should create at least one organizer when none exist
    const Organizer = require(path.join(process.cwd(), 'dist', 'models', 'Organizer.js')).Organizer
    await Organizer.deleteMany({})
    await db.seedOrganizers()
    const count = await Organizer.countDocuments()
    expect(count).to.be.greaterThan(0)
  })
})
