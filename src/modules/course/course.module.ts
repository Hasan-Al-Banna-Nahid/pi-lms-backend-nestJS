import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseRepository } from './course.repository';
import { PrismaService } from 'lib/prisma.service';
import { CloudinaryService } from 'lib/couldninary/cloudinary.service'; // এই লাইনটি চেক করুন

@Module({
  imports: [],
  controllers: [CourseController],
  providers: [
    CourseService,
    CourseRepository,
    PrismaService,
    CloudinaryService,
  ],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
