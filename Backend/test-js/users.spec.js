const { expect } = require('chai')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

let mongod
let app
let Organizer

describe('Users routes (compiled)', function() {
  // Helper to normalize id from several possible response shapes
  function getId(body) {
    if (!body) return ''
    if (body._id) return String(body._id)
    if (body.id) return String(body.id)
    if (body._doc && body._doc._id) return String(body._doc._id)
    return ''
  }
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
    // Normalize id from possible shapes returned by the compiled API
    const id = getId(createRes.body)

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

  it('coverage: exercises getId branches', function() {
    expect(getId({ _id: 'x1' })).to.equal('x1')
    expect(getId({ id: 'x2' })).to.equal('x2')
    expect(getId({ _doc: { _id: 'x3' } })).to.equal('x3')
    expect(getId(null)).to.equal('')
    // body present but without recognized id fields should return empty (exercise fallthrough)
    expect(getId({})).to.equal('')
  })
})

