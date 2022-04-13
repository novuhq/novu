export class UnmountedError extends Error {
  constructor(message = '', ...args) {
    super(message, ...args);
    this.name = 'UnmountedError';
    this.message = message;
  }
}

export class ResponseError extends Error {
  constructor(message = '', data = {}, ...args) {
    super(message, ...args);
    this.name = 'ResponseError';
    this.message = message;
    this.data = data;
  }
}

export class DomainVerificationError extends Error {
  constructor(message = '', ...args) {
    super(message, ...args);
    this.name = 'DomainVerificationError';
    this.message = message;
  }
}
