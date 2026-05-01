import { z } from 'zod';

export const SaasSubscriptionSchema = z.object({
  plan: z.enum(['STARTER', 'BUILDER', 'GROWTH', 'CORE', 'PRO']),
  interval: z.enum(['MONTHLY', 'YEARLY']),
  provider: z.enum([
    'STRIPE',
    'PAYPAL',
    'PADDLE',
    'AUTHORIZE-NET',
    'Alipay',
    'PAYSTACK',
    'RAZORPAY',
    'KLARNA',
    'MOLLIE',
    'VERIFONE',
  ]),
});

export const StudentPurchaseSchema = z.object({
  courseId: z.string().uuid(),
  amount: z.number().positive(),
  provider: z.string(),
});

export const GatewayConfigSchema = z.object({
  provider: z.string(),
  apiKey: z.string().min(1),
  apiSecret: z.string().optional(),
  merchantId: z.string().optional(),
});

export type SaasSubscriptionDto = z.infer<typeof SaasSubscriptionSchema>;
export type StudentPurchaseDto = z.infer<typeof StudentPurchaseSchema>;
