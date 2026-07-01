import {
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  listCommissionRules
} from '../services/commissionRule.service.js';

export async function createRuleHandler(req, res, next) {
  try {
    const rule = await createCommissionRule(req.body, req.user);
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
}

export async function updateRuleHandler(req, res, next) {
  try {
    const rule = await updateCommissionRule(req.params.id, req.body, req.user);
    res.json(rule);
  } catch (error) {
    next(error);
  }
}

export async function deleteRuleHandler(req, res, next) {
  try {
    const result = await deleteCommissionRule(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listRulesHandler(req, res, next) {
  try {
    const result = await listCommissionRules(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
