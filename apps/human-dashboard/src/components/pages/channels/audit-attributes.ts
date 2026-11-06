export function landingAudit(id: string, section: string, kind = 'text', role = 'copy') {
  return {
    'data-prime-audit-id': id,
    'data-prime-audit-section': section,
    'data-prime-audit-kind': kind,
    'data-prime-audit-role': role,
  };
}
