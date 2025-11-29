-- AlterTable
ALTER TABLE "user_messages" ADD COLUMN "room_id" INTEGER;

-- CreateIndex
CREATE INDEX "user_messages_room_id_idx" ON "user_messages"("room_id");
