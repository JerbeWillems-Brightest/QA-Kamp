const { expect } = require('chai')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

let mongod
let app
let Organizer

describe('Users routes (compiled)', function() {
  before(async function() {
    this.timeout(20000)
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

  it('can create, list, get, update and delete organizers', async function() {
    // create
    const createRes = await request(app).post('/api/users').send({ email: 'u1@qa.test', password: 'P1', name: 'U1' })
    expect(createRes.status).to.equal(201)
    const id = String(createRes.body._id || createRes.body.id || createRes.body._doc && createRes.body._doc._id)

    // list
    const listRes = await request(app).get('/api/users')
    expect(listRes.status).to.equal(200)
    expect(listRes.body).to.be.an('array')

    // get
    const getRes = await request(app).get(`/api/users/${id}`)
    expect(getRes.status).to.equal(200)
    expect(getRes.body).to.have.property('email')

    // update
    const updRes = await request(app).put(`/api/users/${id}`).send({ email: 'u1@qa.test', password: 'P2', name: 'U1b' })
    expect(updRes.status).to.equal(200)
    expect(updRes.body).to.have.property('name')

    // delete
    const delRes = await request(app).delete(`/api/users/${id}`)
    expect(delRes.status).to.equal(200)
  })
})

