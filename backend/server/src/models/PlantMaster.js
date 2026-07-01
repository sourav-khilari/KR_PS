import mongoose from 'mongoose';
import { MASTER_STATUSES, MASTER_STATUS } from '../constants/masterData.js';

const plantMasterSchema = new mongoose.Schema(
  {
    plantName: {
      type: String,
      required: true,
      trim: true
    },
    normalizedPlantName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    plantCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    clientCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientCompanyMaster',
      index: true,
      default: null
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: MASTER_STATUSES,
      default: MASTER_STATUS.ACTIVE,
      index: true
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

plantMasterSchema.index(
  { plantCode: 1 },
  { unique: true, partialFilterExpression: { plantCode: { $exists: true, $ne: '' } } }
);

export const PlantMaster = mongoose.model('PlantMaster', plantMasterSchema);
