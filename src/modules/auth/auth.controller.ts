import {
  Controller,
  Post,
  Body,
  UsePipes,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
  Inject,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from './dto/auth.dto';
import type { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register-company')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async registerCompany(@Body() dto: RegisterDto) {
    return this.authService.register(dto, true);
  }

  @Post('resend-otp')
  async resendOtp(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Email is required');
    return this.authService.resendOtp(email);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('create-staff')
  async createStaff(@Body() body: any, @Req() req: any) {
    return this.authService.createStaff(body, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Body('all') all: boolean) {
    return this.authService.logout(req.user.id, req.user.did, all);
  }

  @Post('verify-otp')
  async verify(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyAccount(body.email, body.otp);
  }

  @Post('student-signup')
  async studentSignup(@Body() body: any, @Req() req: any) {
    const rawDomain =
      req.headers['origin'] || req.headers['host'] || body.domain;
    const deviceId = req.headers['x-device-id'] || 'unknown_web_client';

    return this.authService.registerStudent(body, rawDomain, deviceId);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const rawDomain = req.headers['origin'] || req.headers['host'];
    const deviceId = req.headers['x-device-id'] || 'unknown_device';

    return this.authService.login(dto, deviceId, res, rawDomain);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return this.authService.refreshTokens(refreshToken, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate-internal')
  async validateInternal(@Req() req: any) {
    if (!req.user) throw new UnauthorizedException('Invalid Token');
    return {
      userId: req.user.id,
      role: req.user.role,
      companyId: req.user.companyId,
      isValid: true,
    };
  }
}
