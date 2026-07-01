import mongoose from 'mongoose';
import { MASTER_STATUSES, MASTER_STATUS } from '../constants/masterData.js';

const clientCompanyMasterSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    normalizedCompanyName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    companyCode: {
      type: String,
      trim: true,
      uppercase: true,
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
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
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

clientCompanyMasterSchema.index(
  { companyCode: 1 },
  { unique: true, partialFilterExpression: { companyCode: { $exists: true, $ne: '' } } }
);

export const ClientCompanyMaster = mongoose.model('ClientCompanyMaster', clientCompanyMasterSchema);
