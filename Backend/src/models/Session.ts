// ...existing code...
import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  organizerId: mongoose.Types.ObjectId
  startedAt: Date
  name?: string
}

const SessionSchema = new Schema<ISession>(
  {
    organizerId: { type: Schema.Types.ObjectId, ref: 'Organizer', required: true },
    startedAt: { type: Date, default: () => new Date() },
    name: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Session = mongoose.model<ISession>('Session', SessionSchema)
// ...existing code...

