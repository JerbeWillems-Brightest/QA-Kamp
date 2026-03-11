const { expect } = require('chai')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

let mongod
let app
let Organizer, Session, Player

describe('Sessions routes (compiled)', function() {
  before(async function() {
    this.timeout(20000)
    mongod = await MongoMemoryServer.create()
    process.env.MONGO_URI = mongod.getUri()
    process.env.VERCEL = '1'
    await mongoose.connect(process.env.MONGO_URI)
    app = require(path.join(process.cwd(), 'dist', 'index.js')).default
    Organizer = require(path.join(process.cwd(), 'dist', 'models', 'Organizer.js')).Organizer
    Session = require(path.join(process.cwd(), 'dist', 'models', 'Session.js')).Session
    Player = require(path.join(process.cwd(), 'dist', 'models', 'Player.js')).Player
  })

  after(async function() {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
  })

  it('creates session and manages players', async function() {
    const o = await Organizer.create({ email: 's@qa.test', password: 'x', name: 'S' })
    const orgId = String(o._id)
    const res = await request(app).post('/api/sessions').send({ organizerId: orgId, name: 'Test Session' })
    expect(res.status).to.equal(201)
    const sessionId = String(res.body.session._id || res.body.session.id || res.body.session)

    const players = [
      { playerNumber: '201', name: 'A', age: 9, category: '8-10' },
      { playerNumber: '202', name: 'B', age: 12, category: '11-13' }
    ]
    const addRes = await request(app).post(`/api/sessions/${sessionId}/players`).send({ players })
    expect(addRes.status).to.equal(201)
    const listRes = await request(app).get(`/api/sessions/${sessionId}/players`)
    expect(listRes.body.players).to.have.length(2)

    const upd = await request(app).put(`/api/sessions/${sessionId}/players/201`).send({ player: { playerNumber: '201', name: 'A2', age: 10, category: '8-10' } })
    expect(upd.status).to.equal(200)

    const del = await request(app).delete(`/api/sessions/${sessionId}/players/202`)
    expect(del.status).to.equal(200)

    const delSession = await request(app).delete(`/api/sessions/${sessionId}`)
    expect(delSession.status).to.equal(200)
  })
})
