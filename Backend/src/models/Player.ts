import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
  sessionId: mongoose.Types.ObjectId
  nummer: string
  naam: string
  leeftijd: number
  category: string
}

const PlayerSchema = new Schema<IPlayer>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    nummer: { type: String, required: true },
    naam: { type: String, required: true },
    leeftijd: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { timestamps: true }
)

// ensure unique nummer per session at DB level
PlayerSchema.index({ sessionId: 1, nummer: 1 }, { unique: true })

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema)
