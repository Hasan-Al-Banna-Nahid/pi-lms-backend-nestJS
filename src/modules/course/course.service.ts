import { Injectable, Inject } from '@nestjs/common';
import OpenAI from 'openai';
import { CourseRepository } from './course.repository';

@Injectable()
export class CourseService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(@Inject(CourseRepository) private repo: CourseRepository) {}

  async generateAIStudioCourse(
    prompt: string,
    userId: string,
    companyId: string,
  ) {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: `Generate a professional course curriculum for "${prompt}". Return ONLY JSON: 
        { "title": "...", "description": "...", "price": 99, "isProtectionEnabled": true, "curriculum": [{ "title": "Milestone 1", "order": 1, "lessons": ["Video 1", "Video 2"] }] }`,
        },
      ],
    });

    const aiData = JSON.parse(
      completion.choices[0].message.content.replace(/```json|```/g, ''),
    );

    const aiThumbnail = `https://image.pollinations.ai/prompt/high-quality-professional-course-thumbnail-for-${encodeURIComponent(aiData.title)}?width=1080&height=720&nologo=true`;

    const course = await this.repo.createCourseBase(userId, companyId, {
      ...aiData,
      thumbnail: aiThumbnail,
      status: 'DRAFT',
    });

    return {
      message:
        'AI Course Base created. Call Milestone API to attach the curriculum.',
      course: course,
      suggestedCurriculum: aiData.curriculum,
    };
  }

  async createBaseCourse(userId: string, companyId: string, data: any) {
    return this.repo.createCourseBase(userId, companyId, data);
  }

  async giftCourse(courseId: string, studentId: string, adminId: string) {
    return this.repo.createEnrollment({
      courseId,
      studentId,
      isGifted: true,
      giftedBy: adminId,
    });
  }

  async exportCourse(courseId: string) {
    const courseFullData = await this.repo.getCourseWithRelations(courseId);
    return JSON.stringify(courseFullData);
  }

  async importCourse(companyId: string, data: any, userId: string) {
    return this.repo.createCourseBase(userId, companyId, data);
  }
}
