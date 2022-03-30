import { Injectable } from '@nestjs/common';
import { UserEntity, UserRepository } from '@novu/dal';
import { MongooseCrudService } from '../../../shared/crud/mongoose-crud.service';

@Injectable()
export class UsersService extends MongooseCrudService<UserEntity> {
  constructor(private usersRepository: UserRepository) {
    super(usersRepository._model);
  }
}
