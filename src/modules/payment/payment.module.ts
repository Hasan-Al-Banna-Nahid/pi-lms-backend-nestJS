import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { PaymentProcessor } from './payment.processor';
import { MailService } from 'src/mail/mail.service';
import { PrismaModule } from 'lib/prisma.module';
import 'dotenv/config';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payment-queue',
    }),
    PrismaModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, PaymentProcessor, MailService],
  exports: [PaymentService],
})
export class PaymentModule {}
