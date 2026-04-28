import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { CurrentUser, type AuthedUser } from '../common/decorators/current-user.decorator.js';
import { EntitlementService, type Entitlement } from './entitlement.service.js';

/**
 * Web app reads the user's effective tier from this endpoint right
 * after sign-in (and after webhook-driven subscription changes
 * land). Mobile gets the same data through `/user/me/subscriptions`.
 */
@Controller('/me')
@UseGuards(FirebaseAuthGuard)
export class EntitlementController {
  constructor(private readonly entitlement: EntitlementService) {}

  @Get('/entitlement')
  me(@CurrentUser() user: AuthedUser): Promise<Entitlement> {
    return this.entitlement.forUser(user);
  }
}
