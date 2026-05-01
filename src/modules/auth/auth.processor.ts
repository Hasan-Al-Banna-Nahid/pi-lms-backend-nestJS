import { Processor, WorkerHost } from '@nestjs/bullmq';
import { MailService } from 'src/mail/mail.service';
import { AuthRepository } from './auth.repository';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import * as bcrypt from 'bcryptjs';
@Processor('auth-queue')
export class AuthProcessor extends WorkerHost {
  constructor(
    @Inject(MailService) private readonly mailService: MailService,
    @Inject(AuthRepository) private readonly repo: AuthRepository,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      if (job.name === 'register-user') {
        const { password, otp, otpExpires, isOwner, companyName, ...rest } =
          job.data;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.repo.createUser(
          {
            ...rest,
            password: hashedPassword,
            otpCode: otp,
            otpExpires,
          },
          isOwner,
          companyName,
        );

        return await this.mailService.sendOtpEmail(user.email, otp);
      }

      if (job.name === 'send-verification-email') {
        const { email, otp } = job.data;
        return await this.mailService.sendOtpEmail(email, otp);
      }
    } catch (error) {
      console.error('Auth Job Failed:', error);
      throw error;
    }
  }
}
