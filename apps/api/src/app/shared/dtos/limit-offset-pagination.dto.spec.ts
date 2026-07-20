import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { expect } from 'chai';
import { LimitOffsetPaginationQueryDto } from './limit-offset-pagination.dto';

class SortableEntity {
  createdAt: string;
  name: string;
}

const PaginationDto = LimitOffsetPaginationQueryDto(SortableEntity, ['createdAt', 'name']);

describe('LimitOffsetPaginationQueryDto', () => {
  it('should accept limit within the default max of 100', async () => {
    const dto = plainToInstance(PaginationDto, { limit: '100' });
    const errors = await validate(dto);

    expect(errors).to.have.length(0);
    expect(dto.limit).to.equal(100);
  });

  it('should reject limit above the default max of 100', async () => {
    const dto = plainToInstance(PaginationDto, { limit: '101' });
    const errors = await validate(dto);

    expect(errors).to.have.length(1);
    expect(errors[0].property).to.equal('limit');
    expect(errors[0].constraints).to.have.property('max');
  });

  it('should respect a custom maxLimit', async () => {
    const CustomPaginationDto = LimitOffsetPaginationQueryDto(SortableEntity, ['createdAt'], 50);
    const dto = plainToInstance(CustomPaginationDto, { limit: '51' });
    const errors = await validate(dto);

    expect(errors).to.have.length(1);
    expect(errors[0].constraints).to.have.property('max');
  });

  it('should leave limit undefined when omitted so controllers can apply defaults', async () => {
    const dto = plainToInstance(PaginationDto, {});
    const errors = await validate(dto);

    expect(errors).to.have.length(0);
    expect(dto.limit).to.equal(undefined);
  });
});
