-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'NEW';
ALTER TYPE "TicketStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'NEW';
