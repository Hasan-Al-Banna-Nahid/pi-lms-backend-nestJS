import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'lib/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findUserById(id: string) {
    return this.prisma.prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
  }
  async findUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    return this.prisma.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { company: true },
    });
  }
  async getDeviceCount(userId: string): Promise<number> {
    return this.prisma.prisma.device.count({ where: { userId } });
  }

  async findDevice(userId: string, deviceId: string) {
    return this.prisma.prisma.device.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });
  }

  async upsertDevice(userId: string, deviceId: string) {
    return this.prisma.prisma.device.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: { lastLogin: new Date() },
      create: { userId, deviceId },
    });
  }

  async removeDevice(userId: string, deviceId: string) {
    return this.prisma.prisma.device.delete({
      where: { userId_deviceId: { userId, deviceId } },
    });
  }

  async removeAllDevices(userId: string) {
    return this.prisma.prisma.device.deleteMany({ where: { userId } });
  }

  async markUserAsVerified(userId: string) {
    return this.prisma.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, otpCode: null, otpExpires: null },
    });
  }

  async updateRefreshToken(userId: string, token: string | null) {
    await this.prisma.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  async createUser(data: any, isOwner = false, companyName?: string) {
    const emailLower = data.email.toLowerCase().trim();
    const domainLower = data.domain ? data.domain.toLowerCase().trim() : null;

    const finalPasswordHash = data.passwordHash || data.password;

    return await this.prisma.prisma.$transaction(
      async (tx) => {
        let user = await tx.user.create({
          data: {
            email: emailLower,
            passwordHash: finalPasswordHash,
            name: data.name,
            role: data.role ? data.role : isOwner ? 'SUPER_ADMIN' : 'STUDENT',
            companyId: data.companyId || null,
            isVerified: data.isVerified || false,
            otpCode: data.otpCode || null,
            otpExpires: data.otpExpires || null,
          },
        });

        if (isOwner && domainLower) {
          const company = await tx.company.create({
            data: {
              name: companyName || `${data.name}'s Platform`,
              domain: domainLower,
              ownerId: user.id,
            },
          });

          user = await tx.user.update({
            where: { id: user.id },
            data: { companyId: company.id },
            include: { company: true },
          });
        }

        return user;
      },
      { timeout: 30000 },
    );
  }

  async findCompanyByDomain(domain: string) {
    if (!domain) return null;

    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
      .split('/')[0]
      .split(':')[0];

    console.log('Searching for Clean Domain:', cleanDomain);

    return this.prisma.prisma.company.findFirst({
      where: {
        OR: [
          { domain: cleanDomain },
          { domain: `https://${cleanDomain}` },
          { domain: `http://${cleanDomain}` },
          { domain: { contains: cleanDomain } },
        ],
      },
    });
  }

  async updateUserOtp(userId: string, otpCode: string, otpExpires: Date) {
    return await this.prisma.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode,
        otpExpires,
      },
    });
  }
}
