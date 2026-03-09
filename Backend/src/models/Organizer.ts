import mongoose, { Schema, Document } from 'mongoose'

export interface IOrganizer extends Document {
  email: string
  password: string
  name?: string
  createdAt: Date
}

const OrganizerSchema = new Schema<IOrganizer>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Organizer = mongoose.model<IOrganizer>('Organizer', OrganizerSchema)

