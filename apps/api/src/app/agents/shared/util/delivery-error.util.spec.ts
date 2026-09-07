import { BadGatewayException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import { formatDeliveryErrorMessage, resolveDeliveryHttpStatus, toDeliveryError } from './delivery-error.util';

describe('delivery-error.util', () => {
  it('maps adapter ValidationError to HTTP 400', () => {
    const err = Object.assign(new Error('Message text cannot be empty'), {
      name: 'ValidationError',
      code: 'VALIDATION_ERROR',
      adapter: 'telegram',
    });

    expect(resolveDeliveryHttpStatus(err)).to.equal(HttpStatus.BAD_REQUEST);
  });

  it('maps upstream 4xx provider responses to the same status', () => {
    const err = {
      message: 'Provider rejected request',
      status: 403,
    };

    expect(resolveDeliveryHttpStatus(err)).to.equal(HttpStatus.FORBIDDEN);
  });

  it('maps upstream 5xx provider responses to HTTP 502', () => {
    const err = {
      message: 'Provider unavailable',
      status: 503,
    };

    expect(resolveDeliveryHttpStatus(err)).to.equal(HttpStatus.BAD_GATEWAY);
  });

  it('maps unknown delivery failures to HTTP 502', () => {
    expect(resolveDeliveryHttpStatus(new Error('network timeout'))).to.equal(HttpStatus.BAD_GATEWAY);
  });

  it('throws BadRequestException for validation delivery failures', () => {
    const err = Object.assign(new Error('Message text cannot be empty'), {
      name: 'ValidationError',
      code: 'VALIDATION_ERROR',
    });

    expect(() => toDeliveryError(err)).to.throw(BadRequestException);
    try {
      toDeliveryError(err);
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).to.deep.equal({
        error: 'delivery_failed',
        message: 'Message text cannot be empty',
      });
    }
  });

  it('throws BadGatewayException for upstream delivery failures', () => {
    expect(() => toDeliveryError(new Error('network timeout'))).to.throw(BadGatewayException);
  });

  it('throws HttpException with upstream 4xx status for provider client errors', () => {
    const err = {
      message: 'Permission denied',
      status: 403,
    };

    expect(() => toDeliveryError(err)).to.throw(HttpException);
    try {
      toDeliveryError(err);
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.FORBIDDEN);
    }
  });

  it('appends provider response detail when available', () => {
    const err = {
      message: 'Delivery failed',
      response: {
        body: {
          message: 'Invalid file "sample.txt": data must be a base64-encoded string.',
        },
      },
    };

    expect(formatDeliveryErrorMessage(err)).to.equal(
      'Delivery failed: Invalid file "sample.txt": data must be a base64-encoded string.'
    );
  });
});
