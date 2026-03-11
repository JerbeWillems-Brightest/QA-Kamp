const { expect } = require('chai')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

let mongod
let app
let Organizer

describe('Auth routes (compiled)', function() {
  before(async function() {
    this.timeout(20000)
    mongod = await MongoMemoryServer.create()
    process.env.MONGO_URI = mongod.getUri()
    process.env.VERCEL = '1'
    await mongoose.connect(process.env.MONGO_URI)
    // require compiled app
    app = require(path.join(process.cwd(), 'dist', 'index.js')).default
    Organizer = require(path.join(process.cwd(), 'dist', 'models', 'Organizer.js')).Organizer
  })

  after(async function() {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
  })

  it('logs in seeded organizer', async function() {
    await Organizer.create({ email: 'test@qa.test', password: 'Pass123!', name: 'Test' })
    const res = await request(app).post('/api/auth/login').send({ email: 'test@qa.test', password: 'Pass123!' })
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('message')
    expect(res.body.message).to.include('Succesvol')
  })
})
