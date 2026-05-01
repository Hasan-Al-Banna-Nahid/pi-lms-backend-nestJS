import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  private getPiLmsTemplate(
    content: string,
    title: string,
    companyName: string = 'Pi-LMS',
  ) {
    return `
    <div style="background-color: #f4f7ff; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #4285F4, #7B1FA2); padding: 50px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px; letter-spacing: 2px;">Pi-LMS</h1>
          <p style="margin-top: 10px; opacity: 0.9;">${title} | ${companyName}</p>
        </div>
        <div style="padding: 40px; color: #333; line-height: 1.6;">
          ${content}
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
          © 2026 Pi-LMS Infrastructure. Powering education for <b>${companyName}</b>.
        </div>
      </div>
    </div>`;
  }

  async sendSaaSSuccessEmail(email: string, details: any) {
    const content = `
      <div style="text-align: center;">
        <h2 style="color: #7B1FA2;">Subscription Invoice</h2>
        <p>Thank you for choosing Pi-LMS. Your <b>${details.plan}</b> plan is now active.</p>
        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: left;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <span>Plan:</span> <b>${details.plan}</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 18px; color: #7B1FA2;">
            <span>Total Paid:</span> <b>$${details.amount}.00</b>
          </div>
        </div>
      </div>
    `;
    await this.transporter.sendMail({
      from: `"Pi-LMS Billing" <billing@pi-lms.com>`,
      to: email,
      subject: `Invoice: Your ${details.plan} Plan is Active`,
      html: this.getPiLmsTemplate(content, 'SaaS Confirmation', 'Pi-LMS'),
    });
  }

  async sendPaymentSuccessEmail(email: string, details: any) {
    const content = `
      <h2 style="color: #1a73e8; text-align: center;">Enrollment Successful!</h2>
      <p>Hello, you are now a student of <b>${details.courseName}</b>.</p>
      <div style="background: #f9f9f9; border-left: 4px solid #1a73e8; padding: 20px; margin: 20px 0;">
        <p style="margin: 0;"><b>Transaction ID:</b> ${details.referenceId || 'N/A'}</p>
        <p style="margin: 5px 0;"><b>Course:</b> ${details.courseName}</p>
        <p style="margin: 0; color: #1a73e8; font-weight: bold;">Amount Paid: $${details.amount}</p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
      </div>
    `;
    await this.transporter.sendMail({
      from: `"${details.companyName || 'Academy'} Billing" <billing@pi-lms.com>`,
      to: email,
      subject: `Receipt for ${details.courseName}`,
      html: this.getPiLmsTemplate(
        content,
        'Payment Receipt',
        details.companyName,
      ),
    });
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    companyName: string = 'Pi-LMS',
  ) {
    const content = `<h3>Verification Code</h3><div style="font-size: 32px; font-weight: bold; color: #1a73e8;">${otp}</div>`;
    await this.transporter.sendMail({
      from: `"${companyName}" <otp@pi-lms.com>`,
      to: email,
      subject: `Your OTP: ${otp}`,
      html: this.getPiLmsTemplate(content, 'Security', companyName),
    });
  }

  async sendPaymentFailedEmail(email: string, details: any) {
    /* ... implementation from previous response ... */
  }
  async sendSubscriptionExpiredEmail(email: string, companyName: string) {
    /* ... implementation ... */
  }
}
