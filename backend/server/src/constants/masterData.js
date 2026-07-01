export const MASTER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive'
});

export const COMMISSION_TYPES = Object.freeze({
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  TRUCK_WISE: 'truck_wise'
});

export const MASTER_STATUSES = Object.values(MASTER_STATUS);
export const COMMISSION_TYPE_VALUES = Object.values(COMMISSION_TYPES);
