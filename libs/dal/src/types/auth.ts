export type AuthMechanism =
  | 'DEFAULT'
  | 'MONGODB-CR'
  | 'SCRAM-SHA-1'
  | 'SCRAM-SHA-256'
  | 'MONGODB-X509'
  | 'GSSAPI'
  | 'PLAIN';
