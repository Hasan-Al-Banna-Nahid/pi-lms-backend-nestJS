import { Processor, WorkerHost } from '@nestjs/bullmq';
import { MailService } from 'src/mail/mail.service';
import { PaymentRepository } from './payment.repository';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';

@Processor('payment-queue')
export class PaymentProcessor extends WorkerHost {
  constructor(
    @Inject(PaymentRepository) private readonly repo: PaymentRepository,
    @Inject(MailService) private readonly mailService: MailService, // নিশ্চিত করুন এটি Module এ আছে
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { data } = job.data;

    try {
      switch (job.name) {
        case 'process-purchase':
          const purchase = await this.repo.createPurchaseRecord(data);
          await this.mailService.sendPaymentSuccessEmail(data.email, data);
          return purchase;

        case 'process-saas-sub':
          await this.mailService.sendSaaSSuccessEmail(data.email, data);
          break;
      }
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }
}
