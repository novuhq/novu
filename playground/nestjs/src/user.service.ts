import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  getUser(id: string) {
    return {
      name: 'John Doe',
      email: `john.doe.${id}@example.com`,
    };
  }
}
