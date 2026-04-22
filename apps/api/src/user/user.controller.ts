import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { UserService } from './user.service.js';

@Controller('/user')
@UseGuards(FirebaseAuthGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('/me')
  async me(@CurrentUser() user: AuthedUser): Promise<Record<string, unknown>> {
    const id = user.kind === 'jwt' ? user.sub : user.uid;
    return this.users.findMe({ kind: user.kind, id });
  }
}
