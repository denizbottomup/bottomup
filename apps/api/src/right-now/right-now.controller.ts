import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { RightNowService, type RightNowPayload } from './right-now.service.js';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class RightNowController {
  constructor(private readonly rn: RightNowService) {}

  /**
   * `/me/right-now` — anlık deterministic + AI sinyal bundle. Tüm
   * kullanıcılar aynı snapshot'ı görür; cache backend'de tutulur,
   * her 60s deterministic, her 5dk AI overlay ile yenilenir.
   * Kullanıcı bu endpoint'i istediği kadar polleyebilir, upstream
   * trafiğine etkisi yok.
   */
  @Get('/me/right-now')
  snapshot(): RightNowPayload {
    return this.rn.snapshot();
  }
}
