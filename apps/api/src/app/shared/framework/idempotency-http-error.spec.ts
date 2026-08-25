import { HttpException, HttpStatus, InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common';
import { expect } from 'chai';
import { restoreCachedHttpException, serializeCachedHttpError } from './idempotency-http-error';

describe('idempotency-http-error', () => {
  it('round-trips an HttpException through JSON without becoming a 503', () => {
    const original = new UnprocessableEntityException('workflow_not_found');
    const restored = restoreCachedHttpException(JSON.parse(JSON.stringify(serializeCachedHttpError(original))));

    expect(restored).to.be.instanceOf(HttpException);
    expect(restored.getStatus()).to.equal(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(restored.message).to.equal('workflow_not_found');
  });

  it('restores a legacy JSON.stringified HttpException from cache', () => {
    const original = new UnprocessableEntityException('workflow_not_found');
    const restored = restoreCachedHttpException(JSON.parse(JSON.stringify(original)));

    expect(restored).to.be.instanceOf(HttpException);
    expect(restored.getStatus()).to.equal(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(restored.message).to.equal('workflow_not_found');
  });

  it('restores non-HTTP errors as a sanitized InternalServerErrorException', () => {
    const restored = restoreCachedHttpException(JSON.parse(JSON.stringify(serializeCachedHttpError(new Error('boom')))));

    expect(restored).to.be.instanceOf(InternalServerErrorException);
    expect(restored.getStatus()).to.equal(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(restored.message).to.not.equal('boom');
  });
});
