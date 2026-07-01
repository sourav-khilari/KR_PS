import {
  approveImportRow,
  cancelImportSession,
  deleteImportRow,
  getImportSessionDetails,
  finalizeImportSession,
  listImportSessions,
  listImportedData,
  previewLoadImport,
  rejectImportRow,
  saveImportSession,
  updateImportRow
} from '../services/loadImport.service.js';

export async function previewMasterImport(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('Excel file is required');
      error.statusCode = 400;
      throw error;
    }

    const { transportCompanyId, clientCompanyId, plantId } = req.body;
    const result = await previewLoadImport({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      uploadedBy: req.user?.id || req.user?._id,
      createdBy: req.user?.id || req.user?._id,
      updatedBy: req.user?.id || req.user?._id,
      transportCompanyId,
      clientCompanyId,
      plantId
    });

    res.status(201).json({
      session: result.session,
      fileName: req.file.originalname,
      rowCount: result.rows.length,
      status: result.status,
      summary: result.summary,
      messages: result.messages,
      sheetSummaries: result.parsed.sheets,
      rows: result.rows
    });
  } catch (error) {
    next(error);
  }
}

export async function saveMasterImport(req, res, next) {
  try {
    const session = req.body?.sessionId
      ? await saveImportSession(req.body.sessionId, req.user)
      : await finalizeImportSession(req.body, req.user);
    res.status(200).json(session);
  } catch (error) {
    next(error);
  }
}

export async function listMasterImports(_req, res, next) {
  try {
    const imports = await listImportSessions();

    res.json(imports);
  } catch (error) {
    next(error);
  }
}

export async function listImportedDataHandler(req, res, next) {
  try {
    const result = await listImportedData(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMasterImportHandler(req, res, next) {
  try {
    const details = await getImportSessionDetails(req.params.id);
    res.json(details);
  } catch (error) {
    next(error);
  }
}

export async function updateMasterImportRowHandler(req, res, next) {
  try {
    const row = await updateImportRow(req.params.id, req.params.rowId, req.body, req.user);
    res.json(row);
  } catch (error) {
    next(error);
  }
}

export async function approveMasterImportRowHandler(req, res, next) {
  try {
    const row = await approveImportRow(req.params.id, req.params.rowId, req.user);
    res.json(row);
  } catch (error) {
    next(error);
  }
}

export async function deleteMasterImportRowHandler(req, res, next) {
  try {
    const result = await deleteImportRow(req.params.id, req.params.rowId, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function rejectMasterImportRowHandler(req, res, next) {
  try {
    const row = await rejectImportRow(req.params.id, req.params.rowId, req.user);
    res.json(row);
  } catch (error) {
    next(error);
  }
}

export async function cancelMasterImportHandler(req, res, next) {
  try {
    const session = await cancelImportSession(req.params.id, req.user);
    res.json(session);
  } catch (error) {
    next(error);
  }
}
