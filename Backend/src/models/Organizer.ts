import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

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

// Pre-save hook: hash the password if it's new or was modified
OrganizerSchema.pre<IOrganizer>('save', function () {
  const doc = this
  if (!doc.isModified('password')) return undefined
  return bcrypt.hash(doc.password, 10).then((h) => {
    doc.password = h
  })
})

export const Organizer = mongoose.model<IOrganizer>('Organizer', OrganizerSchema)
