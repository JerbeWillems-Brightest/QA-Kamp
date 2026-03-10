import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
  sessionId: mongoose.Types.ObjectId
  playerNumber: string
  name: string
  age: number
  category: string
}

const PlayerSchema = new Schema<IPlayer>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    playerNumber: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { timestamps: true }
)

// ensure unique playerNumber per session at DB level
PlayerSchema.index({ sessionId: 1, playerNumber: 1 }, { unique: true })

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema)
