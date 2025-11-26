-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "senderId" INTEGER NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "roomId" INTEGER,
    "recipientId" INTEGER,
    "recipientName" TEXT,
    "recipientRole" TEXT,
    "patientName" TEXT,
    "patientId" INTEGER,
    "audioData" TEXT,
    "isVoiceMessage" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME
);

-- CreateIndex
CREATE INDEX "messages_roomId_sentAt_idx" ON "messages"("roomId", "sentAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_sentAt_idx" ON "messages"("recipientId", "sentAt");

-- CreateIndex
CREATE INDEX "messages_senderId_sentAt_idx" ON "messages"("senderId", "sentAt");
