import mongoose from 'mongoose';

const paymentRowSchema = new mongoose.Schema(
  {
    paymentBlockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentBlock',
      required: true,
      index: true
    },
    paymentRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentRun',
      required: true,
      index: true
    },
    sourceImportRowIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoadRow'
      }
    ],
    truckNo: {
      type: String,
      required: true
    },
    invoiceDate: {
      type: Date,
      required: true
    },
    merged: {
      type: Boolean,
      default: false
    },
    repeatedTrip: {
      type: Boolean,
      default: false
    },
    partyName: {
      type: String,
      default: ''
    },
    destination: {
      type: String,
      default: ''
    },
    cashAdvanceDate: {
      type: Date,
      default: null
    },
    rowValues: {
      qty: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      comm: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      diesel: { type: Number, default: 0 },
      cashAdvance: { type: Number, default: 0 },
      rfid: { type: Number, default: 0 },
      gps: { type: Number, default: 0 },
      rfidGps: { type: Number, default: 0 },
      urea: { type: Number, default: 0 },
      bagShortage: { type: Number, default: 0 },
      netAmount: { type: Number, default: 0 }
    },
    commissionUsed: {
      type: { type: String, default: 'fixed' },
      value: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      source: { type: String, default: '' },
      matchedRuleId: { type: String, default: null },
      fallbackUsed: { type: Boolean, default: false }
    },
    gstUsed: {
      applicable: { type: Boolean, default: true },
      cgstRate: { type: Number, default: 0 },
      sgstRate: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      netBillAmount: { type: Number, default: 0 }
    },
    tdsUsed: {
      rate: { type: Number, default: 1 },
      amount: { type: Number, default: 0 }
    },
    netPayableUsed: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const PaymentRow = mongoose.model('PaymentRow', paymentRowSchema);
