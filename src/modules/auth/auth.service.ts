import { MailService } from './../../mail/mail.service';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/auth.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private repo: AuthRepository,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(MailService) private MailService: MailService,
    @InjectQueue('auth-queue') private readonly authQueue: Queue,
  ) {}

  async register(dto: any, isOwner = true) {
    const existingUser = await this.repo.findUserByEmail(dto.email);
    if (existingUser) throw new ConflictException('Email already taken');

    if (isOwner && dto.domain) {
      const existingCompany = await this.repo.findCompanyByDomain(dto.domain);
      if (existingCompany)
        throw new ConflictException('This domain is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.repo.createUser(
      {
        ...dto,
        password: hashedPassword,
        otpCode: otp,
        otpExpires,
      },
      isOwner,
    );

    await this.authQueue.add('send-verification-email', {
      email: user.email,
      otp,
    });

    return {
      success: true,
      message: 'Owner registered successfully. Domain instance created.',
    };
  }

  async resendOtp(email: string) {
    const user = await this.repo.findUserByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account already verified');
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // ১০ মিনিট

    await this.repo.updateUserOtp(user.id, newOtp, newOtpExpires);

    await this.authQueue.add('send-verification-email', {
      email: user.email,
      otp: newOtp,
    });

    return {
      success: true,
      message: 'A new OTP has been sent to your email.',
    };
  }

  async createStaff(dto: any, creator: any) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(creator.role)) {
      throw new UnauthorizedException('You do not have permission');
    }

    const existingUser = await this.repo.findUserByEmail(dto.email);
    if (existingUser) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.repo.createUser(
      {
        ...dto,
        password: hashedPassword,
        companyId: creator.companyId,
        isVerified: true,
      },
      false,
    );
  }

  async refreshTokens(oldRefreshToken: string, response: any) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken);

      const user = await this.repo.findUserById(payload.sub);

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('User session not found');
      }

      const isMatch = await bcrypt.compare(oldRefreshToken, user.refreshToken);
      if (!isMatch) {
        await this.repo.updateRefreshToken(user.id, null);
        throw new UnauthorizedException('Security alert: Token reuse detected');
      }

      const { accessToken, refreshToken } = await this.generateTokens(
        user,
        payload.did || 'unknown_device',
      );

      response.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      response.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        message: 'Tokens rotated successfully',
      };
    } catch (e) {
      console.error('Refresh Error:', e.message);
      throw new UnauthorizedException('Session expired or invalid token');
    }
  }

  async verifyAccount(email: string, otp: string) {
    const user = await this.repo.findUserByEmail(email);

    console.log(email, otp);
    if (!user || !user.otpCode || !user.otpExpires) {
      throw new BadRequestException('Invalid request or OTP not found');
    }

    console.log(user?.otpCode);
    if (user?.otpCode !== otp) {
      throw new BadRequestException('The OTP code is incorrect');
    }

    const now = new Date();
    if (now > user.otpExpires) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one',
      );
    }

    await this.repo.markUserAsVerified(user.id);

    return {
      success: true,
      message: 'Account verified successfully. You can now login.',
    };
  }

  async registerStudent(dto: any, origin: string, deviceId: string) {
    const targetDomain = origin || dto.domain;

    const company = await this.repo.findCompanyByDomain(targetDomain);
    if (!company) {
      throw new BadRequestException(
        `Organization not recognized: ${targetDomain}`,
      );
    }

    const existingUser = await this.repo.findUserByEmail(dto.email);
    if (existingUser) throw new ConflictException('Email already taken');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.authQueue.add('register-user', {
      ...dto,
      password: hashedPassword,
      companyId: company.id,
      otp,
      otpExpires,
      deviceId: deviceId,
      role: 'STUDENT',
    });

    return {
      success: true,
      message: 'Registration initiated. Please check your email for OTP.',
    };
  }

  async login(dto: LoginDto, deviceId: string, response: any, origin: string) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.repo.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const targetDomain = origin || (user.company ? user.company.domain : null);

    if (!targetDomain) {
      throw new BadRequestException('Domain origin could not be determined.');
    }

    const currentCompany = await this.repo.findCompanyByDomain(targetDomain);

    console.log('Input Domain:', targetDomain);
    console.log('Company ID from DB:', currentCompany?.id);
    console.log('User Company ID:', user.companyId);

    if (!currentCompany || user.companyId !== currentCompany.id) {
      throw new UnauthorizedException(
        'This domain is not authorized for your account.',
      );
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      deviceId,
    );
    this.setCookies(response, accessToken, refreshToken);

    return { success: true, data: { user, accessToken } };
  }

  private setCookies(res: any, access: string, refresh: string) {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.cookie('access_token', access, { ...options, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refresh, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  async logout(userId: string, deviceId: string, logoutAll: boolean = false) {
    if (logoutAll) {
      await this.repo.removeAllDevices(userId);
    } else {
      try {
        await this.repo.removeDevice(userId, deviceId);
      } catch (e) {
        throw new BadRequestException('Device already logged out or not found');
      }
    }
    return { success: true, message: 'Logout successful' };
  }

  private async generateTokens(user: any, deviceId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      cid: user.companyId,
      did: deviceId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.repo.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        isVerified: user.isVerified,
      },
    };
  }
}
