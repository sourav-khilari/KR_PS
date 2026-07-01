import mongoose from 'mongoose';
import { COMMISSION_TYPE_VALUES, COMMISSION_TYPES, MASTER_STATUSES, MASTER_STATUS } from '../constants/masterData.js';

const ownerMasterSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: true,
      trim: true
    },
    normalizedOwnerName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    panNumber: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      default: ''
    },
    gstApplicable: {
      type: Boolean,
      default: true
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    tdsPercentage: {
      type: Number,
      default: 1,
      min: 0,
      max: 100
    },
    commissionType: {
      type: String,
      enum: COMMISSION_TYPE_VALUES,
      default: COMMISSION_TYPES.FIXED
    },
    commissionValue: {
      type: Number,
      default: 0,
      min: 0
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
    truckWiseCommissionMap: {
      type: Map,
      of: Number,
      default: {}
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

ownerMasterSchema.index(
  { panNumber: 1 },
  { unique: true, partialFilterExpression: { panNumber: { $exists: true, $ne: '' } } }
);

export const OwnerMaster = mongoose.model('OwnerMaster', ownerMasterSchema);
