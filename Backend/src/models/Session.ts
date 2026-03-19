import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  organizerId: mongoose.Types.ObjectId
  startedAt: Date
  name?: string
  code: string
  active: boolean
  createdAt: Date
  activeGameInfo?: any
}

const SessionSchema = new Schema<ISession>(
  {
    organizerId: { type: Schema.Types.ObjectId, ref: 'Organizer', required: true },
    startedAt: { type: Date, default: () => new Date() },
    name: { type: String, default: '' },
    // short human-friendly code used by players to join
    code: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() },
    // optional object describing the currently active game (persisted so remote clients can poll)
    activeGameInfo: { type: Schema.Types.Mixed, default: null },
  }
  // no timestamps — createdAt handled explicitly
)

export const Session = mongoose.model<ISession>('Session', SessionSchema)
