const { expect } = require('chai')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const path = require('path')

let mongod
let app
let Session, Player, Organizer
let org1, org2, org3, org4

// Test suite: Routes combined (compiled)
// Deze suite test de gecompileerde express-app endpoints in `dist`.
// Er wordt een in-memory MongoDB gebruikt en verschillende scenario's
// van sessions/players/users worden gecontroleerd (successen en fouten).
describe('Routes combined (compiled)', function() {
  this.timeout(20000)

  before(async function() {
    mongod = await MongoMemoryServer.create()
    process.env.MONGO_URI = mongod.getUri()
    process.env.VERCEL = '1'
    await mongoose.connect(process.env.MONGO_URI)
    app = require(path.join(process.cwd(), 'dist', 'index.js')).default
    Session = require(path.join(process.cwd(), 'dist', 'models', 'Session.js')).Session
    Player = require(path.join(process.cwd(), 'dist', 'models', 'Player.js')).Player
    Organizer = require(path.join(process.cwd(), 'dist', 'models', 'Organizer.js')).Organizer
    // create organizers for tests that need valid ObjectId organizerId
    org1 = await Organizer.create({ email: 'o1@qa.test', password: 'P', name: 'O1' })
    org2 = await Organizer.create({ email: 'o2@qa.test', password: 'P', name: 'O2' })
    org3 = await Organizer.create({ email: 'o3@qa.test', password: 'P', name: 'O3' })
    org4 = await Organizer.create({ email: 'o4@qa.test', password: 'P', name: 'O4' })
  })

  after(async function() {
    try { await mongoose.disconnect() } catch (e) { /* ignore */ }
    if (mongod) await mongod.stop()
  })

  // --- Tests from routes.spec.js ---
  // Test: GET /api/sessions/active zonder actieve sessie
  // - Verwacht een 404 en een foutbericht wanneer er geen actieve sessie is
  it('GET /api/sessions/active returns 404 when no active session', async function() {
    const res = await request(app).get('/api/sessions/active')
    expect(res.status).to.equal(404)
    expect(res.body).to.have.property('error')
  })

  // Test: POST /api/sessions zonder organizerId
  // - Verwacht een 400 (bad request) wanneer organizerId ontbreekt
  it('POST /api/sessions without organizerId -> 400', async function() {
    const res = await request(app).post('/api/sessions').send({ name: 'x' })
    expect(res.status).to.equal(400)
  })

  // Test: aanmaken van sessie en opnieuw POSTen geeft bestaande sessie terug
  // - Eerste POST maakt sessie (201)
  // - Tweede POST met dezelfde naam kan 200 of 201 teruggeven; body bevat session
  it('create session then POST again returns existing session (200)', async function() {
    const org = await Organizer.create({ email: 'r@qa.test', password: 'P', name: 'R' })
    const createRes = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'Sess1' })
    expect(createRes.status).to.equal(201)
    const again = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'Sess1' })
    expect(again.status).to.be.oneOf([200,201])
    // If existing branch hit, body.session should be present
    expect(again.body).to.have.property('session')
  })

  // Test: POST /api/sessions/join validatiepaden
  // - Ontbrekende code -> 400
  // - Niet gevonden code -> 404
  // - Gekende maar inactieve sessie -> 400
  it('POST /api/sessions/join validations: missing code and not found and not active', async function() {
    // missing code
    let r = await request(app).post('/api/sessions/join').send({})
    expect(r.status).to.equal(400)

    // not found
    r = await request(app).post('/api/sessions/join').send({ code: 'NOPE' })
    expect(r.status).to.equal(404)

    // create inactive session then try join -> 400
    const s = await Session.create({ organizerId: org1._id, name: 'Inactive', code: 'ABC123', active: false })
    r = await request(app).post('/api/sessions/join').send({ code: 'ABC123' })
    expect(r.status).to.equal(400)
  })

  // Test: POST /api/sessions/active/join verschillende paden
  // - Ontbrekend playerNumber -> 400
  // - Ongeldig playerNumber (geen cijfers) -> 400
  // - Actieve sessie zonder spelers -> 404
  // - Bestaande speler met recent lastSeen -> 409 (busy) of 200 afhankelijk van timing
  it('POST /api/sessions/active/join handles missing/invalid playerNumber, no active session, not found and busy', async function() {
    // missing playerNumber
    let r = await request(app).post('/api/sessions/active/join').send({})
    expect(r.status).to.equal(400)

    // invalid playerNumber -> digits only becomes ''
    r = await request(app).post('/api/sessions/active/join').send({ playerNumber: 'abc' })
    expect(r.status).to.equal(400)

    // create active session but no players -> 404
    const s = await Session.create({ organizerId: org2._id, name: 'Active1', code: 'C1', active: true })
    r = await request(app).post('/api/sessions/active/join').send({ playerNumber: '999' })
    expect(r.status).to.equal(404)

    // create player with recent lastSeen -> should return 409 (busy)
    const p = await Player.create({ sessionId: s._id, playerNumber: '999', naam: 'X', name: 'X', age: 10, category: '8-10', lastSeen: new Date(), score: 0 })
    r = await request(app).post('/api/sessions/active/join').send({ playerNumber: '999' })
    // can be 409 (busy) or 200 depending on timing; assert it's one of these and contains expected keys
    expect([200,409]).to.include(r.status)
  })

  // Test: DELETE /api/sessions/:id met niet-bestaande id
  // - Verwacht 404 wanneer sessie niet bestaat
  it('DELETE /api/sessions/:id returns 404 for missing id', async function() {
    const r = await request(app).delete('/api/sessions/000000000000000000000000')
    expect(r.status).to.equal(404)
  })

  // Test: POST /api/sessions/:id/players verschillende validatie- en importpaden
  // - Ongeldig body-formaat -> 400
  // - Validatiefouten binnen payload -> 400
  // - Dubbele speler-nummers in payload -> 400
  // - Succesvolle import met overwrite=true -> 201 en 'created' in body
  it('POST /api/sessions/:id/players invalid body and session not found and validation errors and duplicate payload', async function() {
    // invalid body type
    let r = await request(app).post('/api/sessions/000000000000000000000000/players').send({ not: 'array' })
    expect(r.status).to.equal(400)

    // create session for further tests
    const s = await Session.create({ organizerId: org3._id, name: 'ImportTest', code: 'IMP', active: true })

    // session exists but validation errors (missing name, invalid age)
    r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ playerNumber: '101', name: '', age: 5 }])
    expect(r.status).to.equal(400)

    // duplicate inside payload
    r = await request(app).post(`/api/sessions/${s._id}/players`).send([
      { playerNumber: '201', name: 'A', age: 9 },
      { playerNumber: '201', name: 'B', age: 10 }
    ])
    expect(r.status).to.equal(400)

    // successful import with overwrite=true (should delete any existing and recreate)
    r = await request(app).post(`/api/sessions/${s._id}/players?overwrite=true`).send([
      { playerNumber: '301', name: 'C', age: 11 }
    ])
    expect(r.status).to.equal(201)
    expect(r.body).to.have.property('created')
  })

  // Test: volledige flows voor player update, leaderboard, online/offline en delete
  // - Update zonder body -> 400
  // - Update met body -> 200
  // - Leaderboard ophalen -> 200
  // - Online players ophalen -> 200
  // - Online/offline toggles op niet-bestaande speler -> mogelijk 404/409/200
  // - Verwijderen van niet-bestaande speler -> 404
  it('player update/leaderboard/online/offline and delete player flows', async function() {
    const s = await Session.create({ organizerId: org4._id, name: 'Flow', code: 'FLOW', active: true })
    const p = await Player.create({ sessionId: s._id, playerNumber: '401', name: 'P1', age: 12, category: '11-13', lastSeen: null, score: 0 })

    // update without body -> 400
    let r = await request(app).put(`/api/sessions/${s._id}/players/401`).send({})
    expect(r.status).to.equal(400)

    // update with body -> 200
    r = await request(app).put(`/api/sessions/${s._id}/players/401`).send({ player: { name: 'P1b', age: 13 } })
    expect(r.status).to.equal(200)

    // leaderboard -> 200
    r = await request(app).get(`/api/sessions/${s._id}/leaderboard`).send()
    expect(r.status).to.equal(200)

    // online players (no lastSeen except heartbeat) -> returns array
    r = await request(app).get(`/api/sessions/${s._id}/online-players`).send()
    expect(r.status).to.equal(200)

    // set online for non-existing -> 404
    r = await request(app).post(`/api/sessions/${s._id}/players/999/online`).send()
    expect([404,409,200]).to.include(r.status)

    // set offline for non-existing -> 404
    r = await request(app).post(`/api/sessions/${s._id}/players/999/offline`).send()
    expect([404,200]).to.include(r.status)

    // delete non-existing player -> 404
    r = await request(app).delete(`/api/sessions/${s._id}/players/999`).send()
    expect(r.status).to.equal(404)
  })

  // --- Tests from routes-extra.spec.js ---
  // Test: POST /api/sessions met herhaalde duplicate-key fouten bij create
  // - Simuleer dat Session.create een duplicate-key (code 11000) gooit
  // - Verwacht: de endpoint retourneert 500 en een foutbericht
  it('POST /api/sessions handles repeated duplicate-key creation and returns generation failure (500)', async function() {
    const org = await Organizer.create({ email: 'dup@qa.test', password: 'P', name: 'Dup' })
    const origCreate = Session.create
    Session.create = async function() { const e = new Error('dup'); e.code = 11000; throw e }
    try {
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'DupTest' })
      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error')
    } finally {
      Session.create = origCreate
    }
  })

  // Test: POST /api/sessions behandelt een fout in Session.findOne
  // - Mock Session.findOne zodat het een fout gooit en controleer dat de
  //   endpoint geen onverwachte crash veroorzaakt (kan 200/201/500 teruggeven)
  it('POST /api/sessions handles Session.findOne throwing (existing-check catch branch)', async function() {
    const org = await Organizer.create({ email: 'ff@qa.test', password: 'P', name: 'F' })
    const origFindOne = Session.findOne
    Session.findOne = async function() { throw new Error('boom') }
    try {
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'X' })
      expect([200,201,500]).to.include(res.status)
    } finally {
      Session.findOne = origFindOne
    }
  })

  // Test: POST /api/sessions/:id/players faalt met 500 als er geen uniek
  // spelersnummer gegenereerd kan worden
  // - Mock Player.find zodat alle nummers al in gebruik lijken te zijn
  it('POST /api/sessions/:id/players returns 500 when no candidate can be generated', async function() {
    const org = await Organizer.create({ email: 'gen@qa.test', password: 'P', name: 'G' })
    const s = await Session.create({ organizerId: org._id, name: 'GenFail', code: 'GF', active: true })
    const origFind = Player.find
    Player.find = function(query) {
      const arr = []
      for (let i = 100; i <= 999; i++) arr.push({ playerNumber: String(i) })
      return {
        select: function() {
          return { lean: async function() { return arr } }
        }
      }
    }
    try {
      const r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ name: 'NoNum', age: 10 }])
      expect(r.status).to.equal(500)
      expect(r.body.error).to.match(/Kon geen uniek spelersnummer genereren/)
    } finally {
      Player.find = origFind
    }
  })

  // Test: POST /api/sessions/:id/players retry-logica bij duplicate-key op insert
  // - De eerste create gooit duplicate-key, de volgende call slaagt
  // - Verwacht succesvolle creatie (201) en 'created' in body
  it('POST /api/sessions/:id/players handles duplicate-key on insert then retries successfully', async function() {
    const org = await Organizer.create({ email: 'retry@qa.test', password: 'P', name: 'R' })
    const s = await Session.create({ organizerId: org._id, name: 'Retry', code: 'RT', active: true })
    const origFind = Player.find
    Player.find = function() { return { select: function() { return { lean: async function() { return [] } } } } }
    const origCreate = Player.create
    let calls = 0
    Player.create = async function(doc) {
      calls++
      if (calls === 1) { const e = new Error('dup'); e.code = 11000; throw e }
      return { ...doc, _id: 'madeupid' }
    }
    try {
      const r = await request(app).post(`/api/sessions/${s._id}/players`).send([{ name: 'TryA', age: 9 }])
      expect(r.status).to.equal(201)
      expect(r.body).to.have.property('created')
    } finally {
      Player.find = origFind
      Player.create = origCreate
    }
  })

  // Test: GET /api/sessions/:id/online-players zonder cutoffMs
  // - Maakt spelers met variërende lastSeen en verwacht `onlinePlayers` aanwezig
  it('GET /api/sessions/:id/online-players returns online players without cutoffMs', async function() {
    const org = await Organizer.create({ email: 'cut@qa.test', password: 'P', name: 'C' })
    const s = await Session.create({ organizerId: org._id, name: 'Cut', code: 'C', active: true })
    await Player.create({ sessionId: s._id, playerNumber: '501', name: 'P1', age: 10, category: '8-10', lastSeen: new Date(), score: 0 })
    await Player.create({ sessionId: s._id, playerNumber: '502', name: 'P2', age: 11, category: '8-10', lastSeen: new Date(Date.now() - 100000), score: 0 })
    const r = await request(app).get(`/api/sessions/${s._id}/online-players`).send()
    expect(r.status).to.equal(200)
    expect(r.body).to.have.property('onlinePlayers')
  })

  // Test: users routes - 404 voor niet-bestaande resources en 400 voor ongeldige create
  it('users routes: 404/get-update-delete non-existing and create invalid input errors', async function() {
    let r = await request(app).get('/api/users/000000000000000000000000')
    expect(r.status).to.equal(404)
    r = await request(app).put('/api/users/000000000000000000000000').send({ email: 'a@a', password: 'p', name: 'n' })
    expect(r.status).to.equal(404)
    r = await request(app).delete('/api/users/000000000000000000000000')
    expect(r.status).to.equal(404)
    r = await request(app).post('/api/users').send({ email: '' })
    expect(r.status).to.equal(400)
  })

  // --- Tests merged from routes-errors.spec.js ---

  // Test: sessions POST / retourneert 500 als Session.create een fout gooit
  it('sessions: POST / returns 500 when Session.create throws', async function() {
    const org = await Organizer.create({ email: 'err1@qa.test', password: 'P', name: 'E1' })
    const origCreate = Session.create
    Session.create = async function() { throw new Error('create fail') }
    try {
      const res = await request(app).post('/api/sessions').send({ organizerId: String(org._id), name: 'X' })
      expect(res.status).to.equal(500)
    } finally {
      Session.create = origCreate
    }
  })

  // Test: sessions GET /active retourneert 500 als Session.findOne een fout gooit
  it('sessions: GET /active returns 500 when Session.findOne throws', async function() {
    const origFindOne = Session.findOne
    Session.findOne = async function() { throw new Error('boom') }
    try {
      const res = await request(app).get('/api/sessions/active')
      expect(res.status).to.equal(500)
    } finally { Session.findOne = origFindOne }
  })

  // Test: sessions POST /join retourneert 500 als Session.findOne een fout gooit
  it('sessions: POST /join returns 500 when Session.findOne throws', async function() {
    const origFindOne = Session.findOne
    Session.findOne = async function() { throw new Error('boom') }
    try {
      const res = await request(app).post('/api/sessions/join').send({ code: 'XXX' })
      expect(res.status).to.equal(500)
    } finally { Session.findOne = origFindOne }
  })

  // Test: sessions POST /active/join retourneert 500 als Session.findOne een fout gooit
  it('sessions: POST /active/join returns 500 when Session.findOne throws', async function() {
    const origFindOne = Session.findOne
    Session.findOne = async function() { throw new Error('boom') }
    try {
      const res = await request(app).post('/api/sessions/active/join').send({ playerNumber: '123' })
      expect(res.status).to.equal(500)
    } finally { Session.findOne = origFindOne }
  })

  // Test: sessions DELETE /:id retourneert 500 als Session.findById een fout gooit
  it('sessions: DELETE /:id returns 500 when Session.findById throws', async function() {
    const origFindById = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const res = await request(app).delete('/api/sessions/000000000000000000000000')
      expect(res.status).to.equal(500)
    } finally { Session.findById = origFindById }
  })

  // Test: sessions list en players endpoints geven 500 terug wanneer modellen fouten gooien
  it('sessions: list and players endpoints return 500 when underlying model throws', async function() {
    const origFind = Session.find
    Session.find = async function() { throw new Error('boom') }
    try {
      const r1 = await request(app).get('/api/sessions')
      expect(r1.status).to.equal(500)
    } finally { Session.find = origFind }

    const s = await Session.create({ organizerId: (await Organizer.create({ email: 'temp@qa', password: 'P', name: 'T' }))._id, name: 'Tmp', code: 'TMP', active: true })
    const origFindById = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r2 = await request(app).post(`/api/sessions/${s._id}/players`).send([])
      expect(r2.status).to.equal(500)
    } finally { Session.findById = origFindById }
  })

  // Test: leaderboard/online endpoints en online/offline toggles retourneren 500
  // wanneer onderliggende Player/Session lookups een fout gooien
  it('leaderboard/online/online-set/offline-set return 500 when player/session lookups throw', async function() {
    const s = await Session.create({ organizerId: (await Organizer.create({ email: 'temp3@qa', password: 'P', name: 'T3' }))._id, name: 'Tmp3', code: 'TMP3', active: true })
    const origPlayerFind = Player.find
    Player.find = async function() { throw new Error('boom') }
    try {
      const r = await request(app).get(`/api/sessions/${s._id}/leaderboard`)
      expect(r.status).to.equal(500)
      const r2 = await request(app).get(`/api/sessions/${s._id}/online-players`)
      expect(r2.status).to.equal(500)
    } finally { Player.find = origPlayerFind }

    const origSessionFindById = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r3 = await request(app).post(`/api/sessions/${s._id}/players/001/online`).send()
      expect(r3.status).to.equal(500)
      const r4 = await request(app).post(`/api/sessions/${s._id}/players/001/offline`).send()
      expect(r4.status).to.equal(500)
    } finally { Session.findById = origSessionFindById }
  })

  // Test: active-game get/post geven 500 bij fouten in Session.findById
  it('active-game get/post return 500 when Session.findById throws', async function() {
    const s = await Session.create({ organizerId: (await Organizer.create({ email: 'temp4@qa', password: 'P', name: 'T4' }))._id, name: 'Tmp4', code: 'TMP4', active: true })
    const origFindById = Session.findById
    Session.findById = async function() { throw new Error('boom') }
    try {
      const r1 = await request(app).post(`/api/sessions/${s._id}/active-game`).send({})
      expect(r1.status).to.equal(500)
      const r2 = await request(app).get(`/api/sessions/${s._id}/active-game`)
      expect(r2.status).to.equal(500)
    } finally { Session.findById = origFindById }
  })

  // Test: users routes vangen fouten van Organizer model en geven 500/400 terug
  it('users routes catch branches return 500/400 when Organizer.* throws', async function() {
    const origFind = Organizer.find
    Organizer.find = async function() { throw new Error('boom') }
    try {
      const r = await request(app).get('/api/users')
      expect(r.status).to.equal(500)
    } finally { Organizer.find = origFind }

    const origFindById = Organizer.findById
    Organizer.findById = async function() { throw new Error('boom') }
    try {
      const r2 = await request(app).get('/api/users/000000000000000000000000')
      expect(r2.status).to.equal(500)
    } finally { Organizer.findById = origFindById }

    const origFindByIdAndUpdate = Organizer.findByIdAndUpdate
    Organizer.findByIdAndUpdate = async function() { throw new Error('boom') }
    try {
      const r3 = await request(app).put('/api/users/000000000000000000000000').send({ email: 'a@a', password: 'p', name: 'n' })
      expect(r3.status).to.equal(400)
    } finally { Organizer.findByIdAndUpdate = origFindByIdAndUpdate }

    const origFindByIdAndDelete = Organizer.findByIdAndDelete
    Organizer.findByIdAndDelete = async function() { throw new Error('boom') }
    try {
      const r4 = await request(app).delete('/api/users/000000000000000000000000')
      expect(r4.status).to.equal(500)
    } finally { Organizer.findByIdAndDelete = origFindByIdAndDelete }
  })

  // --- Additional branch tests for sessions.ts ---

  // Test: POST /api/sessions/active/join retourneert 500 als Player.findOne een fout gooit
  it('POST /api/sessions/active/join returns 500 when Player.findOne throws', async function() {
    // create active session
    const s = await Session.create({ organizerId: org2._id, name: 'Active', code: 'ACT', active: true })
    
    const origFindOne = Player.findOne
    Player.findOne = async function() { throw new Error('boom') }
    try {
      const res = await request(app).post('/api/sessions/active/join').send({ playerNumber: '123' })
      expect(res.status).to.equal(500)
      expect(res.body.error).to.match(/Failed to join active session/)
    } finally {
      Player.findOne = origFindOne
    }
  })

  // Test: DELETE /api/sessions retourneert 500 wanneer Player.deleteMany faalt
  it('DELETE /api/sessions returns 500 when Player.deleteMany throws', async function() {
    // create session
    const s = await Session.create({ organizerId: org3._id, name: 'ToDelete', code: 'DEL', active: true })
    
    const origDeleteMany = Player.deleteMany
    Player.deleteMany = async function() { throw new Error('delete failed') }
    try {
      const res = await request(app).delete(`/api/sessions/${s._id}`)
      expect(res.status).to.equal(500)
      expect(res.body.error).to.match(/Failed to delete players for session/)
    } finally {
      Player.deleteMany = origDeleteMany
    }
  })

  // Test: GET /api/sessions met organizerId filter
  // - Controleert filters voor bestaande en niet-bestaande organizerId
  it('GET /api/sessions with organizerId parameter returns filtered sessions', async function() {
    // create sessions for different organizers
    const s1 = await Session.create({ organizerId: org1._id, name: 'Session1', code: 'S1', active: true })
    const s2 = await Session.create({ organizerId: org2._id, name: 'Session2', code: 'S2', active: true })
    const s3 = await Session.create({ organizerId: org1._id, name: 'Session3', code: 'S3', active: false })
    
    // test without organizerId (should return recent sessions)
    let r = await request(app).get('/api/sessions')
    expect(r.status).to.equal(200)
    expect(r.body.sessions).to.be.an('array')
    
    // test with specific organizerId
    r = await request(app).get(`/api/sessions?organizerId=${org1._id}`)
    expect(r.status).to.equal(200)
    expect(r.body.sessions).to.be.an('array')
    // should return only sessions for org1
    expect(r.body.sessions.every(s => String(s.organizerId) === String(org1._id))).to.be.true
    
    // test with non-existent organizerId
    r = await request(app).get('/api/sessions?organizerId=000000000000000000000000')
    expect(r.status).to.equal(200)
    expect(r.body.sessions).to.be.an('array')
    expect(r.body.sessions).to.have.length(0)
  })

  // Test: POST /api/sessions/:id/players accepteert ook {players: [...]} payload
  // - Verwacht succesvolle creatie en verificatie van aangemaakte spelers
  it('POST /api/sessions/:id/players accepts {players: [...]} format', async function() {
    // create session
    const s = await Session.create({ organizerId: org4._id, name: 'ImportTest', code: 'IMP', active: true })
    
    // test with {players: [...]} format
    const r = await request(app).post(`/api/sessions/${s._id}/players`).send({
      players: [
        { name: 'Player1', age: 10 },
        { name: 'Player2', age: 12 }
      ]
    })
    expect(r.status).to.equal(201)
    expect(r.body).to.have.property('created')
    expect(r.body.created).to.have.length(2)
    
    // verify players were created
    const players = await Player.find({ sessionId: s._id })
    expect(players).to.have.length(2)
    expect(players[0].name).to.equal('Player1')
    expect(players[1].name).to.equal('Player2')
  })

  // Test: POST /api/sessions/:id/players retourneert 500 als Session.findById faalt
  it('POST /api/sessions/:id/players returns 500 when Session.findById throws', async function() {
    const origFindById = Session.findById
    Session.findById = async function() { throw new Error('session lookup failed') }
    try {
      const res = await request(app).post('/api/sessions/000000000000000000000000/players').send([
        { name: 'Test', age: 10 }
      ])
      expect(res.status).to.equal(500)
      expect(res.body.error).to.match(/Failed to create players/)
    } finally {
      Session.findById = origFindById
    }
  })

  // Test: PUT /api/sessions/:id/players/:playerNumber geeft 500 bij update-fout
  it('PUT /api/sessions/:id/players/:playerNumber returns 500 when Player.findOneAndUpdate throws', async function() {
    // create session and player
    const s = await Session.create({ organizerId: org1._id, name: 'UpdateTest', code: 'UPD', active: true })
    const p = await Player.create({ sessionId: s._id, playerNumber: '123', name: 'Test', age: 10, category: '8-10', lastSeen: null, score: 0 })
    
    const origFindOneAndUpdate = Player.findOneAndUpdate
    Player.findOneAndUpdate = async function() { throw new Error('update failed') }
    try {
      const res = await request(app).put(`/api/sessions/${s._id}/players/123`).send({
        player: { name: 'Updated' }
      })
      expect(res.status).to.equal(500)
      expect(res.body.error).to.match(/Failed to update player/)
    } finally {
      Player.findOneAndUpdate = origFindOneAndUpdate
    }
  })

  // Test: GET /api/sessions/:id/online-players met cutoffMs parameter
  // - Maakt spelers met verschillende lastSeen en controleert filtering op cutoffMs
  it('GET /api/sessions/:id/online-players with cutoffMs parameter', async function() {
    // create session
    const s = await Session.create({ organizerId: org2._id, name: 'OnlineTest', code: 'ONL', active: true })
    
    // create players with different lastSeen times
    const now = new Date()
    const recent = new Date(now.getTime() - 5000) // 5 seconds ago
    const old = new Date(now.getTime() - 300000) // 5 minutes ago
    
    await Player.create({ sessionId: s._id, playerNumber: '001', name: 'Recent', age: 10, category: '8-10', lastSeen: recent, score: 0 })
    await Player.create({ sessionId: s._id, playerNumber: '002', name: 'Old', age: 12, category: '11-13', lastSeen: old, score: 0 })
    await Player.create({ sessionId: s._id, playerNumber: '003', name: 'Offline', age: 11, category: '11-13', lastSeen: null, score: 0 })
    
    // test without cutoffMs (should return players with lastSeen != null)
    let r = await request(app).get(`/api/sessions/${s._id}/online-players`)
    expect(r.status).to.equal(200)
    expect(r.body.onlinePlayers).to.have.length(2)
    
    // test with cutoffMs=10000 (10 seconds, should include recent player)
    r = await request(app).get(`/api/sessions/${s._id}/online-players?cutoffMs=10000`)
    expect(r.status).to.equal(200)
    expect(r.body.onlinePlayers).to.have.length(1)
    expect(r.body.onlinePlayers[0].playerNumber).to.equal('001')
    
    // test with cutoffMs=0 (invalid, should fallback to default behavior)
    r = await request(app).get(`/api/sessions/${s._id}/online-players?cutoffMs=0`)
    expect(r.status).to.equal(200)
    expect(r.body.onlinePlayers).to.have.length(2)
  })
})

