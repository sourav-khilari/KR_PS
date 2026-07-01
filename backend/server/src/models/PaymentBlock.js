import mongoose from 'mongoose';

const paymentBlockSchema = new mongoose.Schema(
  {
    paymentRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentRun',
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OwnerMaster',
      required: true,
      index: true
    },
    ownerNameSnapshot: {
      type: String,
      required: true
    },
    ownerPanSnapshot: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'rejected'],
      default: 'draft'
    },
    totals: {
      totalQty: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      totalCommission: { type: Number, default: 0 },
      totalGross: { type: Number, default: 0 },
      totalDiesel: { type: Number, default: 0 },
      totalCashAdvance: { type: Number, default: 0 },
      totalRfidGps: { type: Number, default: 0 },
      totalShortage: { type: Number, default: 0 },
      totalTds: { type: Number, default: 0 },
      totalGst: { type: Number, default: 0 },
      totalNetPayable: { type: Number, default: 0 }
    },
    summaryValues: {
      taxableValue: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      netBillAmount: { type: Number, default: 0 },
      lessDiesel: { type: Number, default: 0 },
      lessCashAdvance: { type: Number, default: 0 },
      lessShortage: { type: Number, default: 0 },
      lessTds: { type: Number, default: 0 },
      roundOff: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const PaymentBlock = mongoose.model('PaymentBlock', paymentBlockSchema);
