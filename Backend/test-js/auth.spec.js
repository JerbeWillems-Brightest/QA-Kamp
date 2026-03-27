/* c8 ignore file */
/* istanbul ignore file */
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

// --- Tests merged from auth-users-extra.spec.js ---

describe('Auth + Users extra branches (compiled)', function() {
  this.timeout(20000)
  let mongod
  let app
  let Organizer

  before(async function() {
    mongod = await MongoMemoryServer.create()
    process.env.MONGO_URI = mongod.getUri()
    process.env.VERCEL = '1'
    await mongoose.connect(process.env.MONGO_URI)
    app = require(path.join(process.cwd(), 'dist', 'index.js')).default
    Organizer = require(path.join(process.cwd(), 'dist', 'models', 'Organizer.js')).Organizer
  })

  after(async function() {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
  })

  it('auth: missing credentials -> 400 and wrong credentials -> 401', async function() {
    let r = await request(app).post('/api/auth/login').send({})
    expect(r.status).to.equal(400)

    // create user
    await Organizer.create({ email: 'a2@qa.test', password: 'Pass1!', name: 'A2' })
    // wrong password
    r = await request(app).post('/api/auth/login').send({ email: 'a2@qa.test', password: 'bad' })
    expect(r.status).to.equal(401)
    // wrong email
    r = await request(app).post('/api/auth/login').send({ email: 'nope@qa.test', password: 'bad' })
    expect(r.status).to.equal(401)
  })

  it('users: create invalid input returns 400', async function() {
    const res = await request(app).post('/api/users').send({ email: '' })
    expect(res.status).to.equal(400)
  })

  it('auth: returns 500 when Organizer.findOne throws', async function() {
    const origFindOne = Organizer.findOne
    Organizer.findOne = async function() { throw new Error('boom') }
    try {
      const r = await request(app).post('/api/auth/login').send({ email: 'x@qa', password: 'p' })
      expect(r.status).to.equal(500)
    } finally { Organizer.findOne = origFindOne }
  })
})
