import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  Get,
  Res,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { Response } from 'express';
import { PaymentProvider, PlanType } from 'prisma/generated/prisma/enums';

@Controller('payments')
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly paymentService: PaymentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('saas/subscribe')
  async subscribeSaaS(@Body() body: { plan: PlanType; companyId: string }) {
    return this.paymentService.createSaaSSession(body.companyId, body.plan);
  }

  @UseGuards(JwtAuthGuard)
  @Post('course/buy')
  async buyCourse(@Body() dto: any, @Req() req: any) {
    const targetCompanyId = dto.companyId || req.user.companyId;

    return this.paymentService.createStudentSession(
      req.user.id,
      targetCompanyId,
      dto,
    );
  }

  @Get('verify')
  async verifyPayment(
    @Query('session_id') sessionId: string,
    @Query('type') type: string,
    @Query('companyId') companyId: string,
    @Res() res: Response,
  ) {
    try {
      await this.paymentService.verifyPaymentSession(
        sessionId,
        type,
        companyId,
      );

      return res.send(
        this.getStatusPage(
          'success',
          'Payment Successful! Your account has been updated.',
        ),
      );
    } catch (error) {
      console.error('Verification Error:', error.message);
      return res.send(
        this.getStatusPage(
          'error',
          error.message || 'Payment Verification Failed',
        ),
      );
    }
  }

  @Get('cancel')
  async getCancelPage(@Res() res: Response) {
    return res.send(
      this.getStatusPage('error', 'Payment was cancelled by the user.'),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('gateway/config')
  async configureGateway(
    @Body()
    body: {
      companyId: string;
      provider: PaymentProvider;
      apiKey: string;
      publishableKey: string;
    },
  ) {
    await this.paymentService.saveGatewayConfig(body.companyId, body);

    return {
      success: true,
      message:
        'Stripe configuration saved successfully with Secret and Publishable keys',
    };
  }
  private getStatusPage(status: 'success' | 'error', message: string) {
    const isSuccess = status === 'success';
    const primaryColor = isSuccess ? '#22c55e' : '#ef4444';
    const icon = isSuccess
      ? `<svg style="width:80px;height:80px;color:${primaryColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
      : `<svg style="width:80px;height:80px;color:${primaryColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Status</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
            .card { background: white; padding: 3rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px; width: 90%; }
            .icon { margin-bottom: 1.5rem; }
            h1 { color: #1e293b; margin: 0 0 0.5rem 0; font-size: 1.5rem; }
            p { color: #64748b; margin: 0 0 2rem 0; line-height: 1.5; }
            .btn { display: inline-block; background-color: #4f46e5; color: white; padding: 0.75rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
            .btn:hover { background-color: #4338ca; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">${icon}</div>
            <h1>${isSuccess ? 'Success!' : 'Failed!'}</h1>
            <p>${message}</p>
        </div>
    </body>
    </html>`;
  }
}
