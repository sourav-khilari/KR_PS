import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'SHREE CEMENT LTD.'
    },
    companyGstin: {
      type: String,
      default: ''
    },
    plantName: {
      type: String,
      default: 'PURULIA'
    },
    gstRate: {
      type: Number,
      default: 18
    },
    cgstRate: {
      type: Number,
      default: 9
    },
    sgstRate: {
      type: Number,
      default: 9
    },
    defaultRoundingRule: {
      type: String,
      enum: ['half_up', 'round', 'none'],
      default: 'round'
    }
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
