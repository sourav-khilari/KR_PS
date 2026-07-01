export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  OPERATOR: 'operator'
});

export const ROLE_PERMISSIONS = Object.freeze({
  [USER_ROLES.ADMIN]: [
    'manage_users',
    'manage_truck_master',
    'manage_owner_master',
    'upload_master_excel',
    'validate_data',
    'generate_payment_sheets',
    'change_settings'
  ],
  [USER_ROLES.OPERATOR]: [
    'upload_master_excel',
    'review_data',
    'generate_payment_sheet'
  ]
});

export const ACTIVE_ROLES = Object.values(USER_ROLES);
