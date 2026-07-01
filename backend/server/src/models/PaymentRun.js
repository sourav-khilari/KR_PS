import mongoose from 'mongoose';

const paymentRunSchema = new mongoose.Schema(
  {
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    selectedOwners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OwnerMaster'
      }
    ],
    status: {
      type: String,
      enum: ['draft', 'generated', 'cancelled'],
      default: 'draft'
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    outputFileName: {
      type: String,
      default: ''
    },
    exportContext: {
      transportCompany: { type: String, default: '' },
      transportGst: { type: String, default: '' },
      clientCompany: { type: String, default: '' },
      plant: { type: String, default: '' }
    },
    totals: {
      totalQty: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      totalCommission: { type: Number, default: 0 },
      totalGross: { type: Number, default: 0 },
      totalDiesel: { type: Number, default: 0 },
      totalCashAdvance: { type: Number, default: 0 },
      totalRfidGps: { type: Number, default: 0 },
      totalTds: { type: Number, default: 0 },
      totalGst: { type: Number, default: 0 },
      totalNetPayable: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const PaymentRun = mongoose.model('PaymentRun', paymentRunSchema);
