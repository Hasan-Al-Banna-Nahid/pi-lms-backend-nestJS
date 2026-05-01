import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CloudinaryService } from 'lib/couldninary/cloudinary.service'; // আপনার পাথ অনুযায়ী ঠিক করে নিবেন

@Controller('courses')
export class CourseController {
  constructor(
    @Inject(CourseService) private readonly service: CourseService,
    @Inject(CloudinaryService) private readonly cloudinary: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('ai-generate/:companyId')
  async generateAiCourse(
    @Param('companyId') cid: string,
    @Body('prompt') prompt: string,
    @Req() req: any,
  ) {
    return this.service.generateAIStudioCourse(prompt, req.user.id, cid);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':companyId')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async createBase(
    @Param('companyId') cid: string,
    @Body() body: any,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let thumbnailUrl = body.thumbnail;
    if (file) {
      thumbnailUrl = await this.cloudinary.uploadImage(file);
    }
    const courseData =
      typeof body.data === 'string' ? JSON.parse(body.data) : body;
    courseData.thumbnail = thumbnailUrl;

    return this.service.createBaseCourse(req.user.id, cid, courseData);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/gift')
  async giftCourse(
    @Param('id') courseId: string,
    @Body('studentId') studentId: string,
    @Req() req: any,
  ) {
    return this.service.giftCourse(courseId, studentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/export')
  async exportCourse(@Param('id') courseId: string) {
    return this.service.exportCourse(courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/:companyId')
  async importCourse(
    @Param('companyId') cid: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.service.importCourse(cid, data, req.user.id);
  }

  @Get(':id/preview')
  async previewCourse(@Param('id') courseId: string) {}
}
