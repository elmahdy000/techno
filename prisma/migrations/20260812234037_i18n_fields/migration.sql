-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "shortDescriptionAr" TEXT;
