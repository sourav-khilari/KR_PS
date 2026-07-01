import mongoose from 'mongoose';
import { MASTER_STATUSES, MASTER_STATUS } from '../constants/masterData.js';

const truckMasterSchema = new mongoose.Schema(
  {
    truckNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    normalizedTruckNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OwnerMaster',
      required: true,
      index: true
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
    sourceSeedRunId: {
      type: String,
      trim: true,
      index: true,
      default: ''
    },
    sourceFileName: {
      type: String,
      trim: true,
      default: ''
    },
    sourceSheetName: {
      type: String,
      trim: true,
      default: ''
    },
    sourceRowNumber: {
      type: Number,
      default: null
    },
    sourceStatus: {
      type: String,
      trim: true,
      default: ''
    },
    seededBy: {
      type: String,
      trim: true,
      default: 'master-seeder'
    },
    seededAt: {
      type: Date,
      default: null
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

truckMasterSchema.index(
  { normalizedTruckNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: MASTER_STATUS.ACTIVE }
  }
);

export const TruckMaster = mongoose.model('TruckMaster', truckMasterSchema);
