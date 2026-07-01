import mongoose from 'mongoose';

// Optional rule engine model for truck-wise/context-aware commission.
// NOTE: If you already store truck-wise commission rules in OwnerMaster.truckWiseCommissionMap,
// you may not need this model. However, paymentGeneration.service.js currently imports it.

const commissionRuleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OwnerMaster',
      required: true,
      index: true
    },
    transportCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportCompanyMaster',
      default: null,
      index: true
    },
    clientCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientCompanyMaster',
      default: null,
      index: true
    },
    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlantMaster',
      default: null,
      index: true
    },
    // normalized truck number
    truckNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      index: true
    },

    commissionType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed'
    },

    commissionValue: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

commissionRuleSchema.index(
  {
    ownerId: 1,
    transportCompanyId: 1,
    clientCompanyId: 1,
    plantId: 1,
    truckNumber: 1
  },
  { unique: false }
);

export const CommissionRule = mongoose.model('CommissionRule', commissionRuleSchema);

