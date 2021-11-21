import { Controller } from '@nestjs/common';
import { Crud } from '@nestjsx/crud';
import { UserEntity } from '@notifire/dal';
import { UsersService } from './users.service';

@Crud({
  model: {
    type: UserEntity,
  },
  params: {
    id: {
      type: 'string',
      primary: true,
      field: 'id',
    },
  },
})
@Controller('/admin/entities/users')
export class UsersController {
  constructor(public service: UsersService) {}
}
