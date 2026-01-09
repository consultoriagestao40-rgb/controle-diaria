-- CreateTable
CREATE TABLE "_PostoToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PostoToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Posto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PostoToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_PostoToUser_AB_unique" ON "_PostoToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_PostoToUser_B_index" ON "_PostoToUser"("B");
