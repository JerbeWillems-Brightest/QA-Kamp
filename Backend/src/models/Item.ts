import mongoose, { Schema, Document } from 'mongoose'

export interface IItem extends Document {
  name: string
  description: string
  createdAt: Date
}

const ItemSchema = new Schema<IItem>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
)

export const Item = mongoose.model<IItem>('Item', ItemSchema)

