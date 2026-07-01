import {
  getPaymentPreview,
  savePaymentRun,
  exportPaymentRunExcel,
  getSettings,
  updateSettings,
  getMasterPrepSummary
} from '../services/paymentGeneration.service.js';
import { PaymentRun } from '../models/PaymentRun.js';
import { PaymentBlock } from '../models/PaymentBlock.js';
import { PaymentRow } from '../models/PaymentRow.js';

export async function getPreviewHandler(req, res, next) {
  try {
    const { startDate, endDate, ownerId, transportCompanyId, clientCompanyId, plantId } = req.query;
    if (!startDate || !endDate || !transportCompanyId || !clientCompanyId || !plantId) {
      const err = new Error('startDate, endDate, transportCompanyId, clientCompanyId, and plantId are required');
      err.statusCode = 400;
      throw err;
    }
    const result = await getPaymentPreview({
      startDate,
      endDate,
      ownerId,
      transportCompanyId,
      clientCompanyId,
      plantId
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function saveRunHandler(req, res, next) {
  try {
    const result = await savePaymentRun(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listHistoryHandler(req, res, next) {
  try {
    const runs = await PaymentRun.find().sort({ createdAt: -1 });
    res.json(runs);
  } catch (error) {
    next(error);
  }
}

export async function deleteHistoryHandler(req, res, next) {
  try {
    const { runId } = req.params;
    const run = await PaymentRun.findById(runId);
    if (!run) {
      const err = new Error('Payment run not found');
      err.statusCode = 404;
      throw err;
    }

    const blocks = await PaymentBlock.find({ paymentRunId: runId });
    const blockIds = blocks.map((block) => block._id);

    await PaymentRow.deleteMany({ paymentBlockId: { $in: blockIds } });
    await PaymentBlock.deleteMany({ paymentRunId: runId });
    await PaymentRun.findByIdAndDelete(runId);

    res.json({ success: true, message: 'Payment sheet deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function getRunDetailsHandler(req, res, next) {
  try {
    const { runId } = req.params;
    const run = await PaymentRun.findById(runId);
    if (!run) {
      const err = new Error('Payment run not found');
      err.statusCode = 404;
      throw err;
    }
    const blocks = await PaymentBlock.find({ paymentRunId: runId });
    const blockDetails = [];

    for (const block of blocks) {
      const rows = await PaymentRow.find({ paymentBlockId: block._id });
      blockDetails.push({
        ...block.toObject(),
        rows
      });
    }

    res.json({
      run,
      blocks: blockDetails
    });
  } catch (error) {
    next(error);
  }
}

export async function exportExcelHandler(req, res, next) {
  try {
    const { runId } = req.params;
    const { excelBuffer, outputFileName } = await exportPaymentRunExcel(runId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`);
    res.end(excelBuffer);
  } catch (error) {
    next(error);
  }
}

export async function getGlobalSettingsHandler(req, res, next) {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateGlobalSettingsHandler(req, res, next) {
  try {
    const settings = await updateSettings(req.body);
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function getMasterPrepSummaryHandler(req, res, next) {
  try {
    const summary = await getMasterPrepSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

