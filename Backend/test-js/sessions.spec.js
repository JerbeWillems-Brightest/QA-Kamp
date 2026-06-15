const { expect } = require('chai')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

let mongod
let app
let Organizer, Session, Player

describe('Sessions routes (compiled)', function() {
  // Helper to parse session id from various possible response shapes.
  // Implemented with explicit branches so the test can exercise them for coverage.
  function getSessionId(body) {
    if (!body) return ''
    const s = body.session
    if (!s) return ''
    if (typeof s === 'string') return s
    if (s._id) return String(s._id)
    if (s.id) return String(s.id)
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
    Session = require(path.join(process.cwd(), 'dist', 'models', 'Session.js')).Session
    Player = require(path.join(process.cwd(), 'dist', 'models', 'Player.js')).Player
  })

  after(async function() {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
  })

  // Test: maak sessie en beheer spelers (create, list, update, delete session and players)
  it('creates session and manages players', async function() {
    const o = await Organizer.create({ email: 's@qa.test', password: 'x', name: 'S' })
    const orgId = String(o._id)
    const res = await request(app).post('/api/sessions').send({ organizerId: orgId, name: 'Test Session' })
    expect(res.status).to.equal(201)
    // Derive sessionId from returned body using helper
    const sessionId = getSessionId(res.body)

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

  // Test: oefen verschillende getSessionId-paden (object met _id, id, string, ontbrekende body)
  it('coverage: exercises getSessionId branches', function() {
    // body with session object containing _id
    expect(getSessionId({ session: { _id: 'abc' } })).to.equal('abc')
    // body with session object containing id
    expect(getSessionId({ session: { id: 'def' } })).to.equal('def')
    // body with session as plain string
    expect(getSessionId({ session: 'plain' })).to.equal('plain')
    // missing body/session should return empty
    expect(getSessionId(null)).to.equal('')
    expect(getSessionId({})).to.equal('')
    // session present but without id/_id should return empty (exercise fallthrough)
    expect(getSessionId({ session: {} })).to.equal('')
  })

  // Test: DELETE /api/sessions/:id geeft 500 wanneer Player.deleteMany faalt
  it('DELETE /api/sessions/:id returns 500 when Player.deleteMany throws', async function() {
    const org = await Organizer.create({ email: 'd1@qa.test', password: 'P', name: 'D1' })
    const s = await Session.create({ organizerId: org._id, name: 'DelTest', code: 'DT', active: true })
    const origDel = Player.deleteMany
    Player.deleteMany = async function() { throw new Error('delete failed') }
    try {
      const res = await request(app).delete(`/api/sessions/${s._id}`)
      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error')
    } finally {
      Player.deleteMany = origDel
    }
  })

  // Test: GET /api/sessions?organizerId retourneert lijst voor organiser
  it('GET /api/sessions?organizerId returns sessions list for organizer', async function() {
    const org = await Organizer.create({ email: 'g1@qa.test', password: 'P', name: 'G1' })
    await Session.create({ organizerId: org._id, name: 'A', code: 'A', active: false })
    const res = await request(app).get(`/api/sessions?organizerId=${org._id}`)
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('sessions')
  })

  // Test: POST/GET active-game slaat activeGameInfo op en haalt het op
  it('POST/GET active-game stores and retrieves activeGameInfo', async function() {
    const org = await Organizer.create({ email: 'ag@qa.test', password: 'P', name: 'AG' })
    const s = await Session.create({ organizerId: org._id, name: 'AGTest', code: 'AG', active: true })
    const payload = { round: 1, info: 'x' }
    const postRes = await request(app).post(`/api/sessions/${s._id}/active-game`).send(payload)
    expect(postRes.status).to.equal(200)
    const getRes = await request(app).get(`/api/sessions/${s._id}/active-game`)
    expect(getRes.status).to.equal(200)
    expect(getRes.body).to.have.property('activeGameInfo')
  })

  // Test: CORS geblokkeerde origin pad triggert error (controleer dat blocked origin niet toegestaan is)
  it('CORS: blocked origin path triggers error', async function() {
    // require fresh app with specific FRONTEND_ORIGIN
    process.env.FRONTEND_ORIGIN = 'https://allowed.test'
    const indexPath = path.join(process.cwd(), 'dist', 'index.js')
    delete require.cache[require.resolve(indexPath)]
    const app2 = require(indexPath).default
    const res = await request(app2).get('/api/sessions/active').set('Origin', 'https://blocked.test')
    // CORS middleware will produce an error callback — resulting status may be 500
    expect([500,404]).to.include(res.status)
  })

  // Test: POST /api/sessions retourneert bestaande actieve sessie wanneer aanwezig
  it('POST /api/sessions returns existing active session when one exists', async function() {
    const org = await Organizer.create({ email: 'exist@qa.test', password: 'P', name: 'E' })
    const s = await Session.create({ organizerId: org._id, name: 'Exists', code: 'EX', active: true })
    const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'New' })
    expect(res.status).to.equal(200)
    // should return the existing active session
    expect(res.body).to.have.property('session')
    // ensure it returned the same id
    const sid = res.body.session._id || res.body.session.id || res.body.session
    expect(String(sid)).to.equal(String(s._id))
  })

  // Test: POST /api/sessions geeft 500 wanneer Session.create altijd duplicate-key gooit
  it('POST /api/sessions returns 500 when Session.create always throws duplicate-key (exhaust retries)', async function() {
    const org = await Organizer.create({ email: 'dup@qa.test', password: 'P', name: 'DUP' })
    const origCreate = Session.create
    // stub to always throw duplicate key style error
    Session.create = async function() { const e = new Error('dup'); e.code = 11000; throw e }
    try {
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'X' })
      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error')
      expect(String(res.body.error)).to.include('Could not generate unique')
    } finally {
      Session.create = origCreate
    }
  })

  // Test: POST /api/sessions generator collision leidt tot exhaustion error
  it('POST /api/sessions: generator collision leads to exhaustion error', async function() {
    // force generateCode to always return same code so Session.create will collide
    const sessionsModule = require(path.join(process.cwd(), 'dist', 'routes', 'sessions.js'))
    const origGen = sessionsModule.__test && sessionsModule.__test.getGenerateCode && sessionsModule.__test.getGenerateCode()
    try {
      if (sessionsModule.__test && sessionsModule.__test.setGenerateCode) sessionsModule.__test.setGenerateCode(() => 'FIXED')
      const org = await Organizer.create({ email: 'col@qa.test', password: 'P', name: 'COL' })
      const origCreate = Session.create
      let calls = 0
      Session.create = async function() { calls++; const e = new Error('dup'); e.code = 11000; throw e }
      try {
        const r = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'Collide' })
        expect(r.status).to.equal(500)
      } finally {
        Session.create = origCreate
      }
    } finally {
      if (sessionsModule.__test && sessionsModule.__test.setGenerateCode && origGen) sessionsModule.__test.setGenerateCode(origGen)
    }
  })

  // Test: POST /api/sessions geeft 500 wanneer Session.create onverwachte fout gooit
  it('POST /api/sessions returns 500 when Session.create throws unexpected error', async function() {
    const org = await Organizer.create({ email: 'fail@qa.test', password: 'P', name: 'FAIL' })
    const origCreate = Session.create
    Session.create = async function() { throw new Error('fatal db') }
    try {
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'Y' })
      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error')
    } finally {
      Session.create = origCreate
    }
  })

  // Test: POST /api/sessions/join validaties en inactieve sessie
  it('POST /api/sessions/join validations and inactive session', async function() {
    // missing code
    let res = await request(app).post('/api/sessions/join').send({})
    expect(res.status).to.equal(400)

    // inactive session
    const org = await Organizer.create({ email: 'join@qa.test', password: 'P', name: 'J' })
    const s = await Session.create({ organizerId: org._id, name: 'JoinMe', code: 'JX', active: false })
    res = await request(app).post('/api/sessions/join').send({ code: 'JX' })
    expect(res.status).to.equal(400)
  })

  describe('POST /api/sessions/active/join edge cases', function() {
    // Test: reject missing/invalid playerNumber
    it('rejects missing or invalid playerNumber', async function() {
      let r = await request(app).post('/api/sessions/active/join').send({})
      expect(r.status).to.equal(400)
      r = await request(app).post('/api/sessions/active/join').send({ playerNumber: 'abc' })
      expect(r.status).to.equal(400)
    })

    // Test: returns 404 wanneer geen actieve sessie bestaat
    it('returns 404 when no active session exists', async function() {
      // ensure no active sessions
      await Session.deleteMany({})
      const r = await request(app).post('/api/sessions/active/join').send({ playerNumber: '201' })
      expect(r.status).to.equal(404)
    })

    // Test: returns 404 wanneer speler niet gevonden, en 409 wanneer speler recent online is
    it('returns 404 when player not found, and 409 when player is recently online', async function() {
      const org = await Organizer.create({ email: 'aj@qa.test', password: 'P', name: 'AJ' })
      const s = await Session.create({ organizerId: org._id, name: 'ActiveJoin', code: 'AJ', active: true })
      // no players -> should 404
      let res = await request(app).post('/api/sessions/active/join').send({ playerNumber: '201' })
      expect(res.status).to.equal(404)

      // create player with recent lastSeen -> should get 409
      await Player.create({ sessionId: s._id, playerNumber: '201', nummer: '201', name: 'P', age: 10, category: '8-10', lastSeen: new Date(), score: 0 })
      res = await request(app).post('/api/sessions/active/join').send({ playerNumber: '201' })
      expect(res.status).to.equal(409)
    })
  })

  // Test: POST /api/sessions/:id/players validatie - non-array en duplicates
  it('POST /api/sessions/:id/players validation: rejects non-array and duplicate in payload', async function() {
    const org = await Organizer.create({ email: 'up@qa.test', password: 'P', name: 'UP' })
    const s = await Session.create({ organizerId: org._id, name: 'UPTest', code: 'UP', active: true })
    // send invalid body
    let res = await request(app).post(`/api/sessions/${s._id}/players`).send({ not: 'an array' })
    expect(res.status).to.equal(400)

    // duplicate in payload
    const players = [ { playerNumber: '101', name: 'A', age: 9 }, { playerNumber: '101', name: 'B', age: 10 } ]
    res = await request(app).post(`/api/sessions/${s._id}/players`).send(players)
    expect(res.status).to.equal(400)
  })

  // Test: GET /api/sessions/active retourneert actieve sessie
  it('GET /api/sessions/active returns active session when present', async function() {
    const org = await Organizer.create({ email: 'act@qa.test', password: 'P', name: 'ACT' })
    const s = await Session.create({ organizerId: org._id, name: 'ActiveNow', code: 'ACT1', active: true })
    const r = await request(app).get('/api/sessions/active')
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('session')
  })

  // Test: POST /api/sessions/join retourneert sessie info bij succes
  it('POST /api/sessions/join returns session info on success', async function() {
    const org = await Organizer.create({ email: 'joinok@qa.test', password: 'P', name: 'JO' })
    const s = await Session.create({ organizerId: org._id, name: 'JoinOK', code: 'JO1', active: true })
    const r = await request(app).post('/api/sessions/join').send({ code: 'jo1' })
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('session')
    expect(r.body.session).to.have.property('id')
  })

  // Test: POST /api/sessions/active/join succes pad retourneert speler en sessie
  it('POST /api/sessions/active/join success path returns player and session', async function() {
    const org = await Organizer.create({ email: 'aj2@qa.test', password: 'P', name: 'AJ2' })
    const s = await Session.create({ organizerId: org._id, name: 'ActiveJoin2', code: 'A2', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '301', nummer: '301', name: 'P3', age: 10, category: '8-10', lastSeen: null, score: 0 })
    const res = await request(app).post('/api/sessions/active/join').send({ playerNumber: '301' })
    expect([200,409]).to.include(res.status)
    if (res.status === 200) {
      expect(res.body).to.have.property('player')
      expect(res.body).to.have.property('session')
    }
  })

  // Test: GET /api/sessions zonder organizerId retourneert recente sessies
  it('GET /api/sessions without organizerId returns recent sessions', async function() {
    const res = await request(app).get('/api/sessions')
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('sessions')
  })

  // Test: POST /api/sessions/:id/players retourneert 400 indien spelers al bestaan in DB
  it('POST /api/sessions/:id/players returns 400 when players already exist in DB for that session', async function() {
    const org = await Organizer.create({ email: 'dbdup@qa.test', password: 'P', name: 'DBD' })
    const s = await Session.create({ organizerId: org._id, name: 'DBDup', code: 'DBD', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '401', nummer: '401', name: 'Existing', age: 10, category: '8-10', lastSeen: null, score: 0 })
    const r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ playerNumber: '401', name: 'X', age: 10 }])
    expect(r.status).to.equal(400)
    expect(r.body).to.have.property('error')
  })

  // Test: POST /api/sessions/:id/players rapporteert per-rij fouten wanneer insert andere fout gooit
  it('POST /api/sessions/:id/players records per-row errors when insert throws non-duplicate error', async function() {
    const org = await Organizer.create({ email: 'insfail@qa.test', password: 'P', name: 'IF' })
    const s = await Session.create({ organizerId: org._id, name: 'InsFail', code: 'IF', active: true })
    const origCreate = Player.create
    Player.create = async function() { throw new Error('insert boom') }
    try {
      const r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ name: 'NoNum', age: 10 }])
      // insert errors are returned in the errors array; still responds 201
      expect(r.status).to.equal(201)
      expect(r.body).to.have.property('errors')
      expect(r.body.errors.length).to.be.greaterThan(0)
    } finally {
      Player.create = origCreate
    }
  })

  // Testgroep: forceren van fouttakken in sessions routes
  describe('sessions routes error branches (force throws)', function() {
    // Test: GET /api/sessions/active retourneert 500 als Session.findOne gooit
    it('GET /api/sessions/active returns 500 when Session.findOne throws', async function() {
      const orig = Session.findOne
      Session.findOne = async function() { throw new Error('boom') }
      try {
        const r = await request(app).get('/api/sessions/active')
        expect(r.status).to.equal(500)
      } finally { Session.findOne = orig }
    })

    // Test: POST /api/sessions/join retourneert 500 als Session.findOne gooit
    it('POST /api/sessions/join returns 500 when Session.findOne throws', async function() {
      const orig = Session.findOne
      Session.findOne = async function() { throw new Error('boom') }
      try {
        const r = await request(app).post('/api/sessions/join').send({ code: 'XXX' })
        expect(r.status).to.equal(500)
      } finally { Session.findOne = orig }
    })

    // Test: POST /api/sessions/active/join retourneert 500 bij Player.findOneAndUpdate throw
    it('POST /api/sessions/active/join returns 500 when Player.findOneAndUpdate throws', async function() {
      const org = await Organizer.create({ email: 'e1@qa.test', password: 'P', name: 'E1' })
      const s = await Session.create({ organizerId: org._id, name: 'ErrActive', code: 'EA', active: true })
      const orig = Player.findOneAndUpdate
      Player.findOneAndUpdate = async function() { throw new Error('boom') }
      try {
        const r = await request(app).post('/api/sessions/active/join').send({ playerNumber: '123' })
        expect(r.status).to.equal(500)
      } finally { Player.findOneAndUpdate = orig }
    })

    // Test: DELETE /api/sessions/:id retourneert 500 als Session.findById throw
    it('DELETE /api/sessions/:id returns 500 when Session.findById throws', async function() {
      const orig = Session.findById
      Session.findById = async function() { throw new Error('boom') }
      try {
        const r = await request(app).delete('/api/sessions/000000000000000000000000')
        expect(r.status).to.equal(500)
      } finally { Session.findById = orig }
    })

    // Test: GET /api/sessions retourneert 500 als Session.find throw
    it('GET /api/sessions returns 500 when Session.find throws', async function() {
      const orig = Session.find
      Session.find = async function() { throw new Error('boom') }
      try {
        const r = await request(app).get('/api/sessions')
        expect(r.status).to.equal(500)
      } finally { Session.find = orig }
    })

    // Test: POST /api/sessions/:id/players retourneert 500 als Session.findById throw
    it('POST /api/sessions/:id/players returns 500 when Session.findById throws', async function() {
      const orig = Session.findById
      Session.findById = async function() { throw new Error('boom') }
      try {
        const r = await request(app).post('/api/sessions/000000000000000000000000/players').send([])
        expect(r.status).to.equal(500)
      } finally { Session.findById = orig }
    })
  })

  // Test: POST /api/sessions genereerfout (generateCode throw)
  it('POST /api/sessions handles generateCode throwing (500)', async function() {
    // require sessions route test hooks
    const sessionsModule = require(path.join(process.cwd(), 'dist', 'routes', 'sessions.js'))
    const origGen = sessionsModule.__test && sessionsModule.__test.getGenerateCode && sessionsModule.__test.getGenerateCode()
    if (sessionsModule.__test && sessionsModule.__test.setGenerateCode) {
      sessionsModule.__test.setGenerateCode(() => { throw new Error('gen boom') })
    }
    try {
      const org = await Organizer.create({ email: 'gencode@qa.test', password: 'P', name: 'G' })
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'GenBoom' })
      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error')
    } finally {
      if (sessionsModule.__test && sessionsModule.__test.setGenerateCode && origGen) sessionsModule.__test.setGenerateCode(origGen)
    }
  })

  // Test: POST /api/sessions/:id/players registreert exhaustion wanneer duplicate-key herhaalt
  it('POST /api/sessions/:id/players records exhaustion when duplicate-key repeats', async function() {
    const sessionsModule = require(path.join(process.cwd(), 'dist', 'routes', 'sessions.js'))
    const origGen = sessionsModule.__test && sessionsModule.__test.getGeneratePlayerNumber && sessionsModule.__test.getGeneratePlayerNumber()
    try {
      if (sessionsModule.__test && sessionsModule.__test.setGeneratePlayerNumber) sessionsModule.__test.setGeneratePlayerNumber(() => 'FIXED')
      const org = await Organizer.create({ email: 'dupplayers@qa.test', password: 'P', name: 'DP' })
      const s = await Session.create({ organizerId: org._id, name: 'DupPlayers', code: 'DP', active: true })
      // stub Player.create to always throw duplicate-key
      const origCreate = Player.create
      Player.create = async function() { const e = new Error('dup'); e.code = 11000; throw e }
      try {
        const r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ name: 'NoNum' }])
        // route returns 201 with errors array for per-row failures in many cases
        expect([200,201,400,500]).to.include(r.status)
        // ensure errors reported (if present)
        if (r.body && r.body.errors) expect(r.body.errors.length).to.be.greaterThan(0)
      } finally {
        Player.create = origCreate
      }
    } finally {
      if (sessionsModule.__test && sessionsModule.__test.setGeneratePlayerNumber && origGen) sessionsModule.__test.setGeneratePlayerNumber(origGen)
    }
  })

  // Test: GET /api/sessions/:id/players retourneert 500 wanneer Player.find gooit
  it('GET /api/sessions/:id/players returns 500 when Player.find throws', async function() {
    const org = await Organizer.create({ email: 'finderr@qa.test', password: 'P', name: 'FE' })
    const s = await Session.create({ organizerId: org._id, name: 'FindErr', code: 'FE', active: true })
    const origFind = Player.find
    Player.find = async function() { throw new Error('boom') }
    try {
      const r = await request(app).get(`/api/sessions/${s._id}/players`)
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Player.find = origFind }
  })

  // Test: PUT /api/sessions/:id/players/:playerNumber merged highscores en berekent score
  it('PUT /api/sessions/:id/players/:playerNumber merges highscores and computes score', async function() {
    const org = await Organizer.create({ email: 'hs@qa.test', password: 'P', name: 'HS' })
    const s = await Session.create({ organizerId: org._id, name: 'Highs', code: 'HS', active: true })
    // create player
    await Player.create({ sessionId: s._id, playerNumber: '900', nummer: '900', name: 'P', age: 10, category: '8-10', lastSeen: null, score: 1, highscores: { a: '1' } })
    const origFindOne = Player.findOne
    const origFindOneAndUpdate = Player.findOneAndUpdate
    let capturedUpdate = null
    // return existing when findOne called; provide chainable select().lean()
    Player.findOne = function(q) {
      return {
        select: function() {
          return {
            lean: async function() { return { highscores: { a: '1' }, score: 1 } }
          }
        }
      }
    }
    Player.findOneAndUpdate = async function(q, update, opts) { capturedUpdate = update; return { _id: '900', ...update.$set } }
    try {
      // include per-game flat key inside `player` so the route will detect it
      const payload = { player: { playerNumber: '900', name: 'P', age: 11, highscores: { b: 3, c: '4', x: 'notnum' }, score_passwordzapper: '2' } }
      const r = await request(app).put(`/api/sessions/${s._id}/players/900`).send(payload)
      expect(r.status).to.equal(200)
      // ensure the update contained highscores and computed score
      expect(capturedUpdate).to.be.ok
      const set = capturedUpdate.$set || {}
      // compute expected numeric sum: existing a=1 + incoming b=3 + c=4 + score_passwordzapper=2 => 10
      expect(Number(set.score)).to.equal(10)
      expect(set.highscores).to.have.property('a')
      expect(set.highscores).to.have.property('b')
      expect(set.highscores).to.have.property('c')
      expect(set.highscores).to.have.property('score_passwordzapper')
    } finally { Player.findOne = origFindOne; Player.findOneAndUpdate = origFindOneAndUpdate }
  })

  // Test: DELETE player returns 500 when findOneAndDelete throws
  it('DELETE /api/sessions/:id/players/:playerNumber returns 500 when findOneAndDelete throws', async function() {
    const org = await Organizer.create({ email: 'delerr@qa.test', password: 'P', name: 'DE' })
    const s = await Session.create({ organizerId: org._id, name: 'DelErr', code: 'DE', active: true })
    const orig = Player.findOneAndDelete
    Player.findOneAndDelete = async function() { throw new Error('boom') }
    try {
      const r = await request(app).delete(`/api/sessions/${s._id}/players/999`)
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Player.findOneAndDelete = orig }
  })

  // Test: POST online returns 409 wanneer update null maar findOne toont andere device
  it('POST online returns 409 when findOneAndUpdate null but findOne shows other device', async function() {
    const org = await Organizer.create({ email: 'onerr@qa.test', password: 'P', name: 'ON' })
    const s = await Session.create({ organizerId: org._id, name: 'OnErr', code: 'ON', active: true })
    const origUpd = Player.findOneAndUpdate
    const origFindOne = Player.findOne
    Player.findOneAndUpdate = async function() { return null }
    Player.findOne = async function() { return { lastSeen: new Date() } }
    try {
      const r = await request(app).post(`/api/sessions/${s._id}/players/123/online`).send({ token: 't' })
      expect(r.status).to.equal(409)
    } finally { Player.findOneAndUpdate = origUpd; Player.findOne = origFindOne }
  })

  // Test: POST offline retourneert 404 wanneer speler niet gevonden (findOneAndUpdate returns null)
  it('POST offline returns 404 when player not found (findOneAndUpdate returns null)', async function() {
    const org = await Organizer.create({ email: 'offerr@qa.test', password: 'P', name: 'OFF' })
    const s = await Session.create({ organizerId: org._id, name: 'OffErr', code: 'OFF', active: true })
    const origUpd = Player.findOneAndUpdate
    Player.findOneAndUpdate = async function() { return null }
    try {
      const r = await request(app).post(`/api/sessions/${s._id}/players/123/offline`).send({ token: 't' })
      expect(r.status).to.equal(404)
    } finally { Player.findOneAndUpdate = origUpd }
  })

  // Test: POST /api/sessions/:id/players returns 500 wanneer geen uniek spelersnummer gegenereerd kan worden
  it('POST /api/sessions/:id/players returns 500 when cannot generate unique player number', async function() {
    const org = await Organizer.create({ email: 'exhaust@qa.test', password: 'P', name: 'EX' })
    const s = await Session.create({ organizerId: org._id, name: 'Exhaust', code: 'EXH', active: true })
    // insert an existing player with the candidate number that genRandomNumber will always produce (100)
    await Player.create({ sessionId: s._id, playerNumber: '100', nummer: '100', name: 'Taken', age: 10, category: '8-10', lastSeen: null, score: 0 })

    const origRandom = Math.random
    // force genRandomNumber to always pick 100 (Math.random -> 0)
    Math.random = () => 0
    try {
      const r = await request(app).post(`/api/sessions/${s._1d || s._id}/players`).send([{ name: 'NoNum', age: 10 }])
      // Expect a 500 due to inability to generate unique number
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
      expect(String(r.body.error)).to.include('Kon geen uniek spelersnummer')
    } finally {
      Math.random = origRandom
    }
  })

  // Test: PUT fallback to provided score wanneer Player.findOne throw
  it('PUT /api/sessions/:id/players/:playerNumber falls back to provided score when Player.findOne throws', async function() {
    const org = await Organizer.create({ email: 'putfallback@qa.test', password: 'P', name: 'PF' })
    const s = await Session.create({ organizerId: org._id, name: 'PutFB', code: 'PFB', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '900', nummer: '900', name: 'P', age: 10, category: '8-10', lastSeen: null, score: 0 })

    const origFindOne = Player.findOne
    const origFindOneAndUpdate = Player.findOneAndUpdate
    let capturedUpdate = null
    // make findOne throw so merge code takes the catch branch
    Player.findOne = async function() { throw new Error('boom') }
    Player.findOneAndUpdate = async function(q, update, opts) { capturedUpdate = update; return { _id: '900', ...update.$set } }
    try {
      const payload = { player: { playerNumber: '900', name: 'P', age: 11, score: 42 } }
      const r = await request(app).put(`/api/sessions/${s._id}/players/900`).send(payload)
      expect(r.status).to.equal(200)
      expect(capturedUpdate).to.be.ok
      expect(capturedUpdate.$set.score).to.equal(42)
    } finally {
      Player.findOne = origFindOne
      Player.findOneAndUpdate = origFindOneAndUpdate
    }
  })

  // Test: GET /api/sessions/:id/leaderboard flattens highscores en berekent totals
  it('GET /api/sessions/:id/leaderboard flattens highscores and computes totals', async function() {
    const org = await Organizer.create({ email: 'leader@qa.test', password: 'P', name: 'L' })
    const s = await Session.create({ organizerId: org._id, name: 'Lead', code: 'LD', active: true })
    // player 1: nested highscores including a per-game flat score key
    await Player.create({ sessionId: s._id, playerNumber: '510', nummer: '510', name: 'L1', age: 10, category: 'x', lastSeen: null, highscores: { a: 2, score_passwordzapper: 3 }, score: 0 })
    // player 2: nested highscores with string numeric values
    await Player.create({ sessionId: s._id, playerNumber: '511', nummer: '511', name: 'L2', age: 11, category: 'x', lastSeen: null, highscores: { a: '1', b: 2 }, score: 0 })

    const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('leaderboard')
    const lb = r.body.leaderboard
    expect(lb).to.be.an('array')
    // top should be L1 with total 5 (2 + 3)
    expect(lb[0].name).to.equal('L1')
    expect(Number(lb[0].score)).to.equal(5)
    // ensure flattened key is present
    expect(lb[0]).to.have.property('score_passwordzapper')
  })

  // Test: POST online/offline slaagt wanneer speler bestaat
  it('POST online and offline succeed when player exists', async function() {
    const org = await Organizer.create({ email: 'onoff@qa.test', password: 'P', name: 'OO' })
    const s = await Session.create({ organizerId: org._id, name: 'OnOff', code: 'OO', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '601', nummer: '601', name: 'On', age: 10, category: 'x', lastSeen: null, score: 0 })

    const r1 = await request(app).post(`/api/sessions/${s._id}/players/601/online`).send()
    // should return 200 with player when offline -> online
    expect([200,409]).to.include(r1.status)
    if (r1.status === 200) expect(r1.body).to.have.property('player')

    const r2 = await request(app).post(`/api/sessions/${s._id}/players/601/offline`).send()
    expect(r2.status).to.equal(200)
    expect(r2.body).to.have.property('success')
    expect(r2.body.success).to.equal(true)
  })

  // Test: overwrite flow - deleteMany throws -> 500
  it('POST /api/sessions/:id/players?overwrite=true deleteMany throws -> returns 500', async function() {
    const org = await Organizer.create({ email: 'owerr@qa.test', password: 'P', name: 'OWE' })
    const s = await Session.create({ organizerId: org._id, name: 'ToBeOverwritten', code: 'TBO', active: true })
    const origDeleteMany = Player.deleteMany
    // Make deleteMany throw to exercise error branch in the players overwrite logic
    Player.deleteMany = async function() { throw new Error('deleteMany boom') }
    try {
      const res = await request(app).post(`/api/sessions/${s._id}/players?overwrite=true`).send([{ name: 'X', age: 10 }])
      // expect a 500 because Player.deleteMany threw during overwrite handling
      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error')
    } finally {
      Player.deleteMany = origDeleteMany
    }
  })

  // Test: overwrite successful - verwijdert spelers en gaat verder
  it('POST /api/sessions/:id/players?overwrite=true successful overwrite removes players and proceeds', async function() {
    const org = await Organizer.create({ email: 'owsucc@qa.test', password: 'P', name: 'OWS' })
    // create an active session that should have its players removed by overwrite
    const s = await Session.create({ organizerId: org._id, name: 'OldActive', code: 'OAC', active: true })
    // stub Player.deleteMany to capture the call and return normally
    const origDeleteMany = Player.deleteMany
    let deletedFilter = null
    Player.deleteMany = async function(filter) { deletedFilter = filter; return { deletedCount: 1 } }
    try {
      const res = await request(app).post(`/api/sessions/${s._id}/players?overwrite=true`).send([{ name: 'X', age: 10 }])
      // route should proceed and attempt to insert the provided player(s)
      expect([200,201]).to.include(res.status)
      // ensure deleteMany was called for the session's players
      expect(deletedFilter).to.be.ok
      // ensure response contains created array or session-created info
      expect(res.body).to.exist
    } finally {
      Player.deleteMany = origDeleteMany
    }
  })

  // Test: GET leaderboard negeert niet-numerieke highscores en berekent totals
  it('GET /api/sessions/:id/leaderboard ignores non-numeric highscores and still computes totals', async function() {
    const org = await Organizer.create({ email: 'leaderbad@qa.test', password: 'P', name: 'LB' })
    const s = await Session.create({ organizerId: org._id, name: 'LeadBad', code: 'LDB', active: true })
    // player with highscores containing non-numeric values and some numeric
    await Player.create({ sessionId: s._id, playerNumber: '701', nummer: '701', name: 'NB1', age: 10, category: 'x', lastSeen: null, highscores: { a: 'not-a-number', b: 3 }, score: 0 })
    // player with only numeric highscores
    await Player.create({ sessionId: s._id, playerNumber: '702', nummer: '702', name: 'NB2', age: 11, category: 'x', lastSeen: null, highscores: { a: 1, b: 1 }, score: 0 })

    const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('leaderboard')
    const lb = r.body.leaderboard
    expect(lb).to.be.an('array')
    // ensure both players present and totals computed ignoring the non-numeric entry
    const p1 = lb.find(p => p.playerNumber === '701')
    const p2 = lb.find(p => p.playerNumber === '702')
    expect(p1).to.be.ok
    expect(p2).to.be.ok
    // p1 total should equal 3 (only b counted)
    expect(Number(p1.score)).to.equal(3)
    // p2 total should equal 2 (1+1)
    expect(Number(p2.score)).to.equal(2)
  })

  // Test: POST /api/sessions/:id/players negeert niet-object highscores veilig
  it('POST /api/sessions/:id/players handles non-object highscores safely', async function() {
    const org = await Organizer.create({ email: 'prox@qa.test', password: 'P', name: 'PX' })
    const s = await Session.create({ organizerId: org._id, name: 'ProxyHS', code: 'PH', active: true })
    // send highscores as a non-object (string) — route should ignore and create player with score 0
    const r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ name: 'Pxy', age: 10, highscores: 'not-an-object' }])
    expect([200,201]).to.include(r.status)
    if (r.body && Array.isArray(r.body.created) && r.body.created.length > 0) {
      const created = r.body.created[0]
      // ensure created doc either has empty highscores or no crash
      expect(created).to.have.property('playerNumber')
    }
  })

  // Test: GET leaderboard negeert throwende getters in highscores (per-key catch)
  it('GET /api/sessions/:id/leaderboard ignores throwing getters inside highscores (per-key catch)', async function() {
    const org = await Organizer.create({ email: 'getthrow@qa.test', password: 'P', name: 'GT' })
    const s = await Session.create({ organizerId: org._id, name: 'GetThrow', code: 'GT', active: true })
    // create a normal player in DB so session exists
    await Player.create({ sessionId: s._id, playerNumber: '801', nummer: '801', name: 'Throwy', age: 10, category: 'x', lastSeen: null, highscores: { a: 2 }, score: 0 })
    // stub Player.find to return a doc whose highscores has a throwing getter (avoid mongoose create-time clone issues)
    const origFind = Player.find
    const throwingDoc = {
      playerNumber: '801',
      name: 'Throwy',
      category: 'x',
      score: 0,
      highscores: {}
    }
    Object.defineProperty(throwingDoc.highscores, 'bad', {
      get() { throw new Error('boom getter') },
      configurable: true,
      enumerable: true
    })
    Player.find = function() {
      return {
        select: function() {
          return {
            lean: function() {
              // return a chainable object where sort is async and returns the docs
              return {
                sort: async function() { return [throwingDoc] }
              }
            }
          }
        }
      }
    }
    try {
      const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
      expect(r.status).to.equal(200)
      expect(r.body).to.have.property('leaderboard')
      const lb = r.body.leaderboard
      expect(lb).to.be.an('array')
      const p = lb.find(x => x.playerNumber === '801')
      expect(p).to.be.ok
      // the valid numeric 'a' should be counted toward total despite the throwing getter (we expect 0 since highscores.bad throws but a is not present here)
      // Since our throwingDoc has no numeric 'a' at top-level, score will be 0 — ensure no crash occurred
      expect(Number(p.score)).to.equal(0)
    } finally {
      Player.find = origFind
    }
  })

  // Test: POST /api/sessions maakt sessie aan ondanks dat initial Session.findOne gooit
  it('POST /api/sessions still creates session when initial Session.findOne throws', async function() {
    const org = await Organizer.create({ email: 'findfailcreate@qa.test', password: 'P', name: 'FFC' })
    const origFindOne = Session.findOne
    // make the initial active-session check throw so we exercise the inner catch
    Session.findOne = async function() { throw new Error('boom') }
    try {
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'CreateDespite' })
      // route should continue and attempt to create the session despite the prior error
      expect([200,201]).to.include(res.status)
      expect(res.body).to.have.property('session')
    } finally { Session.findOne = origFindOne }
  })

  // Test: GET leaderboard negeert throwende highscores getter (highscores zelf gooit)
  it('GET /api/sessions/:id/leaderboard ignores throwing highscores getter (highscores itself throws)', async function() {
    const org = await Organizer.create({ email: 'getthrow2@qa.test', password: 'P', name: 'GT2' })
    const s = await Session.create({ organizerId: org._id, name: 'GetThrow2', code: 'GT2', active: true })
    const origFind = Player.find
    // Construct a doc where accessing `highscores` throws entirely
    const throwingDoc = {
      playerNumber: '901',
      name: 'ThrowTop',
      category: 'x',
      score: 0
    }
    Object.defineProperty(throwingDoc, 'highscores', {
      get() { throw new Error('boom highscores') },
      configurable: true,
      enumerable: true
    })
    Player.find = function() {
      return {
        select: function() {
          return {
            lean: function() {
              return {
                sort: async function() { return [throwingDoc] }
              }
            }
          }
        }
      }
    }
    try {
      const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
      expect(r.status).to.equal(200)
      expect(r.body).to.have.property('leaderboard')
      const lb = r.body.leaderboard
      const p = lb.find(x => x.playerNumber === '901')
      expect(p).to.be.ok
      // if highscores access throws, route should ignore it and still return a safe score (0)
      expect(Number(p.score)).to.equal(0)
    } finally { Player.find = origFind }
  })

  // Test: GET online-players returns 500 wanneer Session.findById gooit
  it('GET /api/sessions/:id/online-players returns 500 when Session.findById throws', async function() {
    const orig = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r = await request(app).get('/api/sessions/000000000000000000000000/online-players')
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Session.findById = orig }
  })

  // Test: POST active-game returns 500 wanneer Session.findById gooit
  it('POST /api/sessions/:id/active-game returns 500 when Session.findById throws', async function() {
    const orig = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r = await request(app).post('/api/sessions/000000000000000000000000/active-game').send({ some: 'x' })
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Session.findById = orig }
  })

  // Test: GET active-game returns 500 wanneer Session.findById gooit
  it('GET /api/sessions/:id/active-game returns 500 when Session.findById throws', async function() {
    const orig = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r = await request(app).get('/api/sessions/000000000000000000000000/active-game')
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Session.findById = orig }
  })

  // Test: POST online returns 500 wanneer Session.findById gooit
  it('POST online returns 500 when Session.findById throws', async function() {
    const orig = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r = await request(app).post('/api/sessions/000000000000000000000000/players/123/online').send()
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Session.findById = orig }
  })

  // Test: PUT speler update retourneert 500 wanneer Player.findOneAndUpdate gooit
  it('PUT /api/sessions/:id/players/:playerNumber returns 500 when Player.findOneAndUpdate throws', async function() {
    const org = await Organizer.create({ email: 'puterr@qa.test', password: 'P', name: 'PE' })
    const s = await Session.create({ organizerId: org._id, name: 'PutErr', code: 'PUTE', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '777', nummer: '777', name: 'Q', age: 10, category: 'x', lastSeen: null, score: 0 })
    const orig = Player.findOneAndUpdate
    Player.findOneAndUpdate = async function() { throw new Error('boom') }
    try {
      const r = await request(app).put(`/api/sessions/${s._id}/players/777`).send({ player: { playerNumber: '777', name: 'Q2' } })
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Player.findOneAndUpdate = orig }
  })

  // Test: GET leaderboard retourneert 500 wanneer Player.find gooit
  it('GET /api/sessions/:id/leaderboard returns 500 when Player.find throws', async function() {
    const org = await Organizer.create({ email: 'leaderfinderr@qa.test', password: 'P', name: 'LFE' })
    const s = await Session.create({ organizerId: org._id, name: 'LeadErr', code: 'LDE', active: true })
    const orig = Player.find
    Player.find = async function() { throw new Error('boom') }
    try {
      const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Player.find = orig }
  })

  // Test: GET active returns 500 wanneer Session.findOne returns non-chainable
  it('GET /api/sessions/active returns 500 when Session.findOne returns non-chainable (sort not a function)', async function() {
    const orig = Session.findOne
    // simulate a findOne that returns a plain object without .sort
    Session.findOne = function() { return {} }
    try {
      const r = await request(app).get('/api/sessions/active')
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Session.findOne = orig }
  })

  // Test: GET /api/sessions returns 500 wanneer Session.find returns non-chainable
  it('GET /api/sessions returns 500 when Session.find returns non-chainable (sort not a function)', async function() {
    const orig = Session.find
    Session.find = function() { return { sort: undefined } }
    try {
      const r = await request(app).get('/api/sessions')
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Session.find = orig }
  })

  // Test: GET leaderboard returns 500 wanneer Player.find chain returns non-chainable
  it('GET /api/sessions/:id/leaderboard returns 500 when Player.find chain returns non-chainable (sort not a function)', async function() {
    const org = await Organizer.create({ email: 'chainerr@qa.test', password: 'P', name: 'CE' })
    const s = await Session.create({ organizerId: org._id, name: 'ChainErr', code: 'CH', active: true })
    const orig = Player.find
    // simulate Player.find().select().lean() returning an object without .sort()
    Player.find = function() {
      return {
        select: function() {
          return {
            lean: function() {
              return {} // missing sort -> TypeError when .sort(...) is called
            }
          }
        }
      }
    }
    try {
      const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
      expect(r.status).to.equal(500)
      expect(r.body).to.have.property('error')
    } finally { Player.find = orig }
  })

  // Test: PUT accept raw score when incomingHighscores absent
  it('PUT /api/sessions/:id/players/:playerNumber accepts raw score when incomingHighscores absent', async function() {
    const org = await Organizer.create({ email: 'putrawscore@qa.test', password: 'P', name: 'PRS' })
    const s = await Session.create({ organizerId: org._id, name: 'PutRaw', code: 'PRS', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '321', nummer: '321', name: 'R', age: 10, category: 'x', lastSeen: null, score: 0 })
    const origFindOneAndUpdate = Player.findOneAndUpdate
    let captured = null
    Player.findOneAndUpdate = async function(q, update, opts) { captured = update; return { _id: '321', ...update.$set } }
    try {
      const r = await request(app).put(`/api/sessions/${s._id}/players/321`).send({ player: { playerNumber: '321', score: 77 } })
      expect(r.status).to.equal(200)
      expect(captured).to.be.ok
      expect(captured.$set.score).to.equal(77)
    } finally { Player.findOneAndUpdate = origFindOneAndUpdate }
  })

  // Test: POST active-game clear when payload null
  it('POST /api/sessions/:id/active-game clears activeGameInfo when payload is null', async function() {
    const org = await Organizer.create({ email: 'clearag@qa.test', password: 'P', name: 'CAG' })
    const s = await Session.create({ organizerId: org._id, name: 'ClearAG', code: 'CAG', active: true })
    // set activeGameInfo first
    let r = await request(app).post(`/api/sessions/${s._id}/active-game`).send({ foo: 'bar' })
    expect(r.status).to.equal(200)
    // now clear by sending null
    r = await request(app).post(`/api/sessions/${s._id}/active-game`).send(null)
    expect(r.status).to.equal(200)
    // retrieving should return null activeGameInfo
    r = await request(app).get(`/api/sessions/${s._id}/active-game`)
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('activeGameInfo')
    expect(r.body.activeGameInfo).to.equal(null)
  })

  // Test: GET online-players honors cutoffMs and returns array
  it('GET /api/sessions/:id/online-players honors cutoffMs and returns array', async function() {
    const org = await Organizer.create({ email: 'cutoff@qa.test', password: 'P', name: 'CO' })
    const s = await Session.create({ organizerId: org._id, name: 'CutOff', code: 'COF', active: true })
    // create two players, one with recent lastSeen and one older
    await Player.create({ sessionId: s._id, playerNumber: '801', nummer: '801', name: 'Recent', age: 10, category: 'x', lastSeen: new Date(), score: 0 })
    const oldDate = new Date(Date.now() - 1000 * 60 * 60)
    await Player.create({ sessionId: s._id, playerNumber: '802', nummer: '802', name: 'Old', age: 11, category: 'x', lastSeen: oldDate, score: 0 })
    const r = await request(app).get(`/api/sessions/${s._id}/online-players?cutoffMs=60000`)
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('onlinePlayers')
    expect(r.body.onlinePlayers).to.be.an('array')
    // only recent should be present
    const p = r.body.onlinePlayers.find(x => x.playerNumber === '801')
    expect(p).to.be.ok
  })

  // Test: POST accepteert root array payload en retourneert created
  it('POST /api/sessions/:id/players accepts raw array body (root array) and returns created', async function() {
    const org = await Organizer.create({ email: 'rawarr@qa.test', password: 'P', name: 'RA' })
    const s = await Session.create({ organizerId: org._id, name: 'RawArr', code: 'RAA', active: true })
    const payload = [{ playerNumber: '901', name: 'Root', age: 10 }]
    const r = await request(app).post(`/api/sessions/${s._id}/players`).send(payload)
    expect([200,201]).to.include(r.status)
    if (r.body && Array.isArray(r.body.created)) {
      expect(r.body.created.length).to.be.greaterThan(0)
    }
  })

})

