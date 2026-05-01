import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'lib/prisma.service';
import {
  PaymentProvider,
  SubscriptionStatus,
} from 'prisma/generated/prisma/enums';

@Injectable()
export class PaymentRepository {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async findExpiredSubscriptions() {
    return this.prismaService.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { lt: new Date() },
        status: 'ACTIVE',
      },
    });
  }

  async updateSubscriptionStatus(
    companyId: string,
    status: SubscriptionStatus,
  ) {
    return this.prismaService.prisma.subscription.update({
      where: { companyId },
      data: { status },
    });
  }

  async getGatewayConfig(companyId: string, provider: PaymentProvider) {
    return this.prismaService.prisma.paymentGateway.findUnique({
      where: {
        companyId_provider: {
          companyId: companyId,
          provider: provider,
        },
      },
    });
  }

  async createPurchaseRecord(data: any) {
    return this.prismaService.prisma.coursePurchase.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        amount: data.amount,
        provider: data.provider,
        referenceId: data.referenceId,
      },
    });
  }

  async handleSuccessfulSubscription(companyId: string, subscriptionData: any) {
    if (!companyId || companyId === 'undefined') {
      throw new Error('Cannot update subscription: companyId is missing');
    }

    return this.prismaService.prisma.$transaction(
      async (tx) => {
        return tx.subscription.upsert({
          where: { companyId: companyId },
          update: {
            plan: subscriptionData.plan,
            status: subscriptionData.status,
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
          },
          create: {
            companyId: companyId,
            plan: subscriptionData.plan,
            status: subscriptionData.status,
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
            provider: PaymentProvider.STRIPE,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }
  async upsertGatewayConfig(
    companyId: string,
    provider: PaymentProvider,
    apiKey: string,
    publishableKey: string,
  ) {
    return this.prismaService.prisma.paymentGateway.upsert({
      where: {
        companyId_provider: {
          companyId: companyId,
          provider: provider,
        },
      },
      update: {
        apiKey: apiKey,
        publishableKey: publishableKey,
      },
      create: {
        companyId: companyId,
        provider: provider,
        apiKey: apiKey,
        publishableKey: publishableKey,
      },
    });
  }

  async getCourseForPurchase(courseId: string) {
    return this.prismaService.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        price: true,
        company: { select: { name: true } },
      },
    });
  }
}
