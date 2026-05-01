-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'CTO';
ALTER TYPE "UserRole" ADD VALUE 'JOB_PLACEMENT_LEAD';
ALTER TYPE "UserRole" ADD VALUE 'JOB_PLACEMENT_SUPPORT';
ALTER TYPE "UserRole" ADD VALUE 'COO';
ALTER TYPE "UserRole" ADD VALUE 'TECHNOLOGY_INSTRUCTOR';
