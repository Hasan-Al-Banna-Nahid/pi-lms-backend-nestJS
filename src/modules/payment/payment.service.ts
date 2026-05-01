import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import Stripe from 'stripe';
import type { Stripe as StripeType } from 'stripe';
import { PlanType, PaymentProvider } from 'prisma/generated/prisma/enums';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentService {
  private saasStripe: StripeType;

  constructor(
    @Inject(PaymentRepository) private readonly repo: PaymentRepository,
    @InjectQueue('payment-queue') private readonly paymentQueue: Queue,
  ) {
    this.saasStripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2023-10-16' as any,
    });
  }

  async createSaaSSession(companyId: string, plan: PlanType) {
    const prices = {
      STARTER: 29,
      BUILDER: 70,
      GROWTH: 150,
      CORE: 4000,
      PRO: 8000,
    };

    const session = await this.saasStripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `PI-LMS Plan: ${plan}` },
            unit_amount: prices[plan] * 100,
            recurring: {
              interval: plan === 'CORE' || plan === 'PRO' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.BACKEND_URL}/payments/verify?session_id={CHECKOUT_SESSION_ID}&type=SAAS_SUB&companyId=${companyId}`,
      cancel_url: `${process.env.BACKEND_URL}/payments/cancel`,
      metadata: { companyId, plan, type: 'SAAS_SUB' },
    });

    return { url: session.url };
  }

  async createStudentSession(studentId: string, companyId: string, dto: any) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const config = await this.repo.getGatewayConfig(
      companyId,
      dto.provider || PaymentProvider.STRIPE,
    );

    if (!config || !config.apiKey) {
      throw new BadRequestException(
        'This academy has not configured their payment gateway yet.',
      );
    }

    // const course = await this.repo.getCourseForPurchase(dto.courseId); // কমেন্ট করা হলো

    const course = {
      title: 'Testing Course (Fake)',
      price: 50,
      company: { name: 'Demo Academy' },
    };

    const ownerStripe = new Stripe(config.apiKey, {
      apiVersion: '2023-10-16' as any,
    });

    const session = await ownerStripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${course.title} (ID: ${dto.courseId})`,
              description: `Testing payment for course id: ${dto.courseId}`,
            },
            unit_amount: Math.round(course.price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.BACKEND_URL}/payments/verify?session_id={CHECKOUT_SESSION_ID}&type=COURSE_BUY&companyId=${companyId}&courseId=${dto.courseId}&studentId=${studentId}`,
      cancel_url: `${process.env.BACKEND_URL}/payments/cancel`,
      metadata: {
        studentId: studentId,
        courseId: dto.courseId,
        courseName: course.title,
        type: 'COURSE_BUY',
      },
    });

    return { url: session.url };
  }

  async verifyPaymentSession(
    sessionId: string,
    type: string,
    companyIdQuery: string,
  ) {
    let session: any;

    if (!companyIdQuery || companyIdQuery === 'undefined') {
      throw new BadRequestException('Company ID is required for verification');
    }

    try {
      if (type === 'SAAS_SUB') {
        session = await this.saasStripe.checkout.sessions.retrieve(sessionId);
      } else {
        const config = await this.repo.getGatewayConfig(
          companyIdQuery,
          PaymentProvider.STRIPE,
        );
        if (!config || !config.apiKey)
          throw new BadRequestException('Gateway config not found');

        const ownerStripe = new Stripe(config.apiKey, {
          apiVersion: '2023-10-16' as any,
        });
        session = await ownerStripe.checkout.sessions.retrieve(sessionId);
      }

      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment incomplete');
      }

      const email = session.customer_details?.email;
      const amount = (session.amount_total || 0) / 100;

      if (type === 'SAAS_SUB') {
        const plan = session.metadata?.plan as PlanType;

        await this.repo.handleSuccessfulSubscription(companyIdQuery, {
          plan,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        await this.paymentQueue.add('process-saas-sub', {
          data: { email, plan, amount },
        });
      }

      if (type === 'COURSE_BUY') {
        await this.paymentQueue.add('process-purchase', {
          data: {
            userId: session.metadata?.studentId,
            courseId: session.metadata?.courseId,
            courseName: session.metadata?.courseName,
            companyName: session.metadata?.companyName,
            email: email,
            amount: amount,
            referenceId: session.id,
            provider: PaymentProvider.STRIPE,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error(`Verification Error:`, error.message);
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }
  }

  async saveGatewayConfig(companyId: string, body: any) {
    const { provider, apiKey, publishableKey } = body;
    if (!companyId) throw new BadRequestException('Company ID is missing');
    return await this.repo.upsertGatewayConfig(
      companyId,
      provider,
      apiKey,
      publishableKey,
    );
  }
}
