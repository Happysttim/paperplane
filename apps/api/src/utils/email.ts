const reservedEmailNames = new Set([
  'noreply',
  'no-reply',
  'no_reply',
  'admin',
  'administrator',
  'postmaster',
  'hostmaster',
  'webmaster',
  'abuse',
  'security',
  'support',
  'contact',
  'info',
  'billing',
  'root',
  'system',
]);

/** 이메일의 @ 앞부분이 운영용 예약 이름과 정확히 일치하는지 검사합니다. */
export const isReservedEmailAddress = (address: string): boolean => {
  const localPart = address.trim().toLowerCase().split('@')[0];
  return localPart !== undefined && reservedEmailNames.has(localPart);
};
