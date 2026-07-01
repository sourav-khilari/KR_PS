import mongoose from 'mongoose';

const masterSeedRunSchema = new mongoose.Schema(
  {
    seedRunId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    sourceFiles: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    status: {
      type: String,
      enum: ['completed', 'completed_with_conflicts', 'failed'],
      default: 'completed'
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sheetSummaries: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    skippedRows: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    conflicts: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    reportFileName: {
      type: String,
      trim: true,
      default: ''
    },
    reportFilePath: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: String,
      trim: true,
      default: 'master-seeder'
    }
  },
  { timestamps: true }
);

export const MasterSeedRun = mongoose.model('MasterSeedRun', masterSeedRunSchema);