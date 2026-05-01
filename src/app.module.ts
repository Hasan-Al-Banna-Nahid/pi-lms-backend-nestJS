import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from 'lib/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { PaymentModule } from './modules/payment/payment.module';
import { CourseModule } from './modules/course/course.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    PaymentModule,
    CourseModule,
    BullModule.forRoot({
      connection: {
        username: 'default',
        password: '8ruhndPhFazO220xO3ZbSztzocQxVzvB',
        host: 'redis-10523.c10.us-east-1-2.ec2.cloud.redislabs.com',
        port: 10523,
        connectTimeout: 20000,
        maxRetriesPerRequest: null,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
