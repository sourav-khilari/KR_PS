import mongoose from 'mongoose';

const validationMessageSchema = new mongoose.Schema(
  {
    rowNumber: Number,
    field: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'warning'
    },
    message: String
  },
  { _id: false }
);

const masterRowSchema = new mongoose.Schema(
  {
    rowNumber: Number,
    sheetName: String,
    sourceRowData: mongoose.Schema.Types.Mixed,
    rawRow: mongoose.Schema.Types.Mixed,
    normalizedRow: mongoose.Schema.Types.Mixed,
    validationMessages: [validationMessageSchema]
  },
  { _id: false }
);

const importSessionSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    rowCount: {
      type: Number,
      default: 0
    },
    validCount: {
      type: Number,
      default: 0
    },
    warningCount: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['previewed', 'edited', 'approved', 'saved', 'cancelled', 'rejected'],
      default: 'previewed'
    },
    sheetNames: {
      type: [String],
      default: []
    },
    transportCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportCompanyMaster'
    },
    clientCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientCompanyMaster'
    },
    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlantMaster'
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

const loadRowSchema = new mongoose.Schema(
  {
    importSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportSession',
      required: true,
      index: true
    },
    sourceSheetName: {
      type: String,
      trim: true,
      default: ''
    },
    sourceRowNumber: {
      type: Number,
      required: true
    },
    rawRow: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    normalizedRow: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    validationMessages: [validationMessageSchema],
    transportCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportCompanyMaster',
      index: true
    },
    clientCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientCompanyMaster',
      index: true
    },
    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlantMaster',
      index: true
    },
    editedValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    editStatus: {
      type: String,
      enum: ['unchanged', 'edited'],
      default: 'unchanged'
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
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

const masterImportSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true
    },
    rowCount: {
      type: Number,
      required: true
    },
    gstRate: {
      type: Number,
      default: 18
    },
    status: {
      type: String,
      enum: ['valid', 'warnings', 'errors'],
      default: 'valid'
    },
    validationMessages: [validationMessageSchema],
    rows: [masterRowSchema]
  },
  { timestamps: true }
);

export const MasterImport = mongoose.model('MasterImport', masterImportSchema);
export const ImportSession = mongoose.model('ImportSession', importSessionSchema);
export const LoadRow = mongoose.model('LoadRow', loadRowSchema);

