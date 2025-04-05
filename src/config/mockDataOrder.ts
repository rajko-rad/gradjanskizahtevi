/**
 * This file maintains the ordering of data to match the original mockData.ts file,
 * ensuring consistent presentation even as we move to real database data.
 */

/**
 * Order of category IDs from mockData
 */
export const CATEGORY_ORDER = [
  'media',
  'elections',
  'security',
  'judiciary',
  'government'
];

/**
 * Order of requests by category ID from mockData
 */
export const REQUEST_ORDER: Record<string, string[]> = {
  'media': ['rts', 'rem'],
  'elections': ['voter-lists'],
  'security': ['bia'],
  'judiciary': ['zagorka'],
  'government': [
    'transition-gov',
    'transition-period',
    'transition-composition',
    'opposition-list'
  ]
};

/**
 * Order of timeline event dates from mockData
 */
export const TIMELINE_DATE_ORDER = [
  '15. april 2023.',
  '23. maj 2023.',
  '7. jul 2023.',
  '12. decembar 2023.'
];

/**
 * Adds a new ID to the order list for a specific category
 * Useful for maintaining order when adding new items
 */
export function addToRequestOrder(categoryId: string, requestId: string, position: 'start' | 'end' = 'end'): void {
  if (!REQUEST_ORDER[categoryId]) {
    REQUEST_ORDER[categoryId] = [];
  }
  
  // Check if ID already exists
  if (REQUEST_ORDER[categoryId].includes(requestId)) {
    return;
  }
  
  // Add to specified position
  if (position === 'start') {
    REQUEST_ORDER[categoryId].unshift(requestId);
  } else {
    REQUEST_ORDER[categoryId].push(requestId);
  }
} 