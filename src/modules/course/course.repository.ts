import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'lib/prisma.service';

@Injectable()
export class CourseRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async createCourseBase(userId: string, companyId: string, data: any) {
    const { prerequisiteIds = [], ...courseData } = data || {};

    return this.prisma.prisma.course.create({
      data: {
        title: courseData.title,
        slug: courseData.title
          ? `${courseData.title.toLowerCase().replace(/ /g, '-')}-${Date.now()}`
          : `course-${Date.now()}`,
        description: courseData.description,
        thumbnail: courseData.thumbnail,
        price: Number(courseData.price) || 0,

        status: courseData.status || 'DRAFT',
        password: courseData.password || null,
        isProtectionEnabled: !!courseData.isProtectionEnabled,
        isBundle: !!courseData.isBundle,
        dripEnabled: !!courseData.dripEnabled,
        isGiftingEnabled: !!courseData.isGiftingEnabled,

        companyId: companyId,
        creatorId: userId,

        prerequisites: {
          connect: prerequisiteIds.map((id: string) => ({ id })),
        },
      },
    });
  }

  async getCourseWithRelations(id: string) {
    return this.prisma.prisma.course.findUnique({
      where: { id },
      include: {
        milestones: {
          include: { contents: true },
          orderBy: { order: 'asc' },
        },
        attachments: true,
        prerequisites: true,
      },
    });
  }

  async createEnrollment(data: any) {
    return this.prisma.prisma.enrollment.create({ data });
  }
}
