import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
  sessionId: mongoose.Types.ObjectId
  playerNumber: string
  nummer?: string
  name: string
  age: number
  category: string
  lastSeen?: Date
  score?: number
  // store per-minigame highscores under a single object so we can sum them server-side
  highscores?: Record<string, number>
}

const PlayerSchema = new Schema<IPlayer>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    playerNumber: { type: String, required: true },
    // legacy alias used previously in the project and present in existing DB indexes
    nummer: { type: String },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    category: { type: String, required: true },
    lastSeen: { type: Date, required: false },
    score: { type: Number, required: false, default: 0 },
    // allow storing per-game highscore fields here to avoid adding dynamic top-level
    // properties to the document. Use a mixed object so keys like
    // { score_passwordzapper: 60, score_printerslaatophol: 40 } are preserved.
    highscores: { type: Schema.Types.Mixed, required: false, default: {} },
  },
  { timestamps: true }
)

// keep existing index (sessionId + playerNumber) — do not try to drop indexes here.
// The DB may still have an index on sessionId + nummer; to be safe we populate
// `nummer` on insert/update so that index is no longer storing null values.
PlayerSchema.index({ sessionId: 1, playerNumber: 1 }, { unique: true })

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema)
