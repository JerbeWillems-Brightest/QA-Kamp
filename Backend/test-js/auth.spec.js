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

// Test suite: Auth routes (compiled)
// Deze suite laadt de gecompileerde app uit `dist` en gebruikt een in-memory
// MongoDB (MongoMemoryServer) om endpoint-requests te testen zonder een
// externe database. Hier testen we de basis login-flow voor een seeded
// Organizer.
describe('Auth routes (compiled)', function() {
  this.timeout(20000)
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

  // Test: seeded organizer kan succesvol inloggen
  // - We maken een Organizer aan met bekende credentials
  // - We POSTen naar /api/auth/login met die credentials
  // - Verwacht: HTTP 200 en een bericht dat 'Succesvol' bevat
  it('logs in seeded organizer', async function() {
    await Organizer.create({ email: 'test@qa.test', password: 'Pass123!', name: 'Test' })
    const res = await request(app).post('/api/auth/login').send({ email: 'test@qa.test', password: 'Pass123!' })
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('message')
    expect(res.body.message).to.include('Succesvol')
  })
})

// --- Tests merged from auth-users-extra.spec.js ---

// Test suite: Auth + Users extra branches (compiled)
// Deze suite test extra randgevallen voor authenticatie en gebruikersroutes,
// waaronder foutafhandeling (missing credentials, ongeldige input) en het
// gedrag wanneer een intern model (Organizer.findOne) een fout gooit.
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

  // Test: authenticatie valideert invoer en behandelt verkeerde credentials
  // - Wanneer credentials ontbreken verwachten we 400 (bad request)
  // - Bij een bekend e-mailadres maar verkeerd wachtwoord verwachten we 401
  // - Bij een onbekend e-mailadres verwachten we ook 401
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

  // Test: POST /api/users met ongeldige input moet een 400 teruggeven
  // - We sturen een lege e-mail (ongeldig) en verwachten validatiefout
  it('users: create invalid input returns 400', async function() {
    const res = await request(app).post('/api/users').send({ email: '' })
    expect(res.status).to.equal(400)
  })

  // Test: de server geeft 500 terug wanneer een intern model een fout gooit
  // - We mocken `Organizer.findOne` zodat het een fout gooit
  // - Verwacht: de endpoint-handler vangt de fout niet stilletjes op maar
  //   retourneert een 500 (internal server error)
  it('auth: returns 500 when Organizer.findOne throws', async function() {
    const origFindOne = Organizer.findOne
    Organizer.findOne = async function() { throw new Error('boom') }
    try {
      const r = await request(app).post('/api/auth/login').send({ email: 'x@qa', password: 'p' })
      expect(r.status).to.equal(500)
    } finally { Organizer.findOne = origFindOne }
  })
})
