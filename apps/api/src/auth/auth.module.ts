import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { FirebaseService } from './firebase.service.js';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, FirebaseService],
  exports: [AuthService, FirebaseService, JwtModule],
})
export class AuthModule {}
