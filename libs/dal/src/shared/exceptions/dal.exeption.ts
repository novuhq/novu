export class DalException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DalException.prototype);
  }
}
