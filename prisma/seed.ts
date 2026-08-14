import { PrismaClient, type Role, type ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  PERMISSION_DEFS,
  ROLE_PERMISSIONS,
  type PermissionCode,
} from "../src/lib/permissions";
import { toMinor } from "../src/lib/money";
import {
  computeItemCommission,
  computeOrderTotals,
  nextOrderNumber,
  getDefaultCommissionRate,
} from "../src/lib/commerce";
import { placeholderUrl } from "../src/lib/store/image-store";
import { slugify, generateUniqueSuffix } from "../src/lib/utils";

const prisma = new PrismaClient();

async function seedPermissions() {
  const permissionIds: Record<string, string> = {};
  for (const [code, def] of Object.entries(PERMISSION_DEFS)) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: { name: def.name, group: def.group, description: def.description },
      create: {
        code,
        name: def.name,
        group: def.group,
        description: def.description,
      },
    });
    permissionIds[code] = perm.id;
  }

  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: role as Role,
            permissionId: permissionIds[code as PermissionCode],
          },
        },
        update: {},
        create: {
          role: role as Role,
          permissionId: permissionIds[code as PermissionCode],
        },
      });
    }
  }
  return permissionIds;
}

async function seedConfig() {
  const configs = [
    { key: "default_commission_rate", value: 0.07, description: "Platform commission rate (7%)" },
    { key: "free_shipping_threshold", value: 5_000_00, description: "Free shipping above this amount (minor units)" },
    { key: "shipping_fee", value: 100_00, description: "Flat shipping fee (minor units)" },
  ];
  for (const c of configs) {
    await prisma.commissionConfig.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: c,
    });
  }
}

async function seedUsers() {
  const seedPassword = process.env.SEED_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const users = [
    { name: "System Admin", email: "admin@technomarket.eg", role: "SUPER_ADMIN" },
    { name: "Operations Team", email: "ops@technomarket.eg", role: "ADMIN" },
    { name: "Ahmed Hassan", email: "ahmed@niletech.eg", role: "VENDOR" },
    { name: "Sara Mostafa", email: "sara@caitech.eg", role: "VENDOR" },
    { name: "Omar Khaled", email: "omar@digiparts.eg", role: "VENDOR" },
    { name: "Yasmine Adel", email: "yasmine@example.com", role: "CUSTOMER" },
    { name: "Karim Fouad", email: "karim@example.com", role: "CUSTOMER" },
  ] as const;

  const created: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, active: true },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        emailVerified: new Date(),
        phone: "01000000000",
      },
    });
    created[u.email] = user.id;
  }
  return created;
}

async function seedVendors(userIds: Record<string, string>) {
  const vendors = [
    {
      name: "NileTech Store",
      nameAr: "متجر نايل تك",
      email: "ahmed@niletech.eg",
      description: "Premium laptops and desktop workstations.",
      descriptionAr: "لابتوبات وأجهزة مكتبية فاخرة.",
    },
    {
      name: "Cairo PC Components",
      nameAr: "مكونات كايرو بي سي",
      email: "sara@caitech.eg",
      description: "All PC components — CPUs, GPUs, motherboards, memory and storage.",
      descriptionAr: "جميع مكونات الكمبيوتر — معالجات وكرت شاشة ولوحات أم وذاكرة وتخزين.",
    },
    {
      name: "DigiParts Egypt",
      nameAr: "ديجي بارتس مصر",
      email: "omar@digiparts.eg",
      description: "Accessories, peripherals and genuine spare parts.",
      descriptionAr: "إكسسوارات وأجهزة طرفية وقطع غيار أصلية.",
    },
  ];

  const vendorByUser: Record<string, string> = {};
  for (const v of vendors) {
    const slug = `${slugify(v.name)}-${generateUniqueSuffix()}`;
    const vendor = await prisma.vendor.upsert({
      where: { userId: userIds[v.email] },
      update: { name: v.name, status: "APPROVED" },
      create: {
        name: v.name,
        slug,
        description: v.description,
        email: v.email,
        phone: "02-25000000",
        userId: userIds[v.email],
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
    vendorByUser[v.email] = vendor.id;
  }
  return vendorByUser;
}

type CategorySeed = {
  name: string;
  nameAr: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  sortOrder?: number;
  children?: CategorySeed[];
};

const categoryTree: CategorySeed[] = [
  {
    name: "Laptops",
    nameAr: "لابتوبات",
    slug: "laptops",
    description: "Ultrabooks, gaming and business laptops",
    descriptionAr: "أجهزة فائقة النحافة وأجهزة ألعاب وأجهزة أعمال",
    sortOrder: 1,
    children: [
      { name: "Ultrabooks", nameAr: "ألترابوك", slug: "ultrabooks", sortOrder: 1 },
      { name: "Gaming Laptops", nameAr: "لابتوبات الألعاب", slug: "gaming-laptops", sortOrder: 2 },
      { name: "Business Laptops", nameAr: "لابتوبات الأعمال", slug: "business-laptops", sortOrder: 3 },
      { name: "2-in-1 Laptops", nameAr: "لابتوبات 2 في 1", slug: "convertible-laptops", sortOrder: 4 },
    ],
  },
  {
    name: "Desktop PCs",
    nameAr: "أجهزة مكتبية",
    slug: "desktops",
    description: "Prebuilt, gaming and mini desktops",
    descriptionAr: "أجهزة جاهزة وأجهزة ألعاب وميني بي سي",
    sortOrder: 2,
    children: [
      { name: "Prebuilt Desktops", nameAr: "أجهزة جاهزة", slug: "prebuilt-desktops", sortOrder: 1 },
      { name: "Gaming Desktops", nameAr: "أجهزة الألعاب", slug: "gaming-desktops", sortOrder: 2 },
      { name: "Mini PCs", nameAr: "ميني بي سي", slug: "mini-pcs", sortOrder: 3 },
      { name: "Workstations", nameAr: "محطات عمل", slug: "workstations", sortOrder: 4 },
    ],
  },
  {
    name: "Components",
    nameAr: "مكونات",
    slug: "components",
    description: "Everything inside your PC",
    descriptionAr: "كل ما هو داخل جهاز الكمبيوتر الخاص بك",
    sortOrder: 3,
    children: [
      { name: "Processors (CPU)", nameAr: "معالجات (CPU)", slug: "processors", sortOrder: 1 },
      { name: "Graphics Cards (GPU)", nameAr: "كرت الشاشة (GPU)", slug: "graphics-cards", sortOrder: 2 },
      { name: "Motherboards", nameAr: "اللوحات الأم", slug: "motherboards", sortOrder: 3 },
      { name: "Memory (RAM)", nameAr: "الذاكرة (RAM)", slug: "memory-ram", sortOrder: 4 },
      { name: "Storage (SSD/HDD)", nameAr: "التخزين (SSD/HDD)", slug: "storage", sortOrder: 5 },
      { name: "Power Supplies", nameAr: "مزودات الطاقة", slug: "power-supplies", sortOrder: 6 },
      { name: "Cases", nameAr: "الشاسيهات", slug: "pc-cases", sortOrder: 7 },
      { name: "Cooling", nameAr: "التبريد", slug: "cooling", sortOrder: 8 },
    ],
  },
  {
    name: "Accessories",
    nameAr: "إكسسوارات",
    slug: "accessories",
    description: "Peripherals and upgrades",
    descriptionAr: "أجهزة طرفية وترقيات",
    sortOrder: 4,
    children: [
      { name: "Keyboards", nameAr: "لوحات المفاتيح", slug: "keyboards", sortOrder: 1 },
      { name: "Mice", nameAr: "الفئران", slug: "mice", sortOrder: 2 },
      { name: "Headphones", nameAr: "سماعات الرأس", slug: "headphones", sortOrder: 3 },
      { name: "Monitors", nameAr: "الشاشات", slug: "monitors", sortOrder: 4 },
      { name: "Laptop Bags", nameAr: "حقائب اللابتوب", slug: "laptop-bags", sortOrder: 5 },
    ],
  },
  {
    name: "Spare Parts",
    nameAr: "قطع غيار",
    slug: "spare-parts",
    description: "Genuine replacement parts",
    descriptionAr: "قطع استبدال أصلية",
    sortOrder: 5,
    children: [
      { name: "Laptop Batteries", nameAr: "بطاريات اللابتوب", slug: "laptop-batteries", sortOrder: 1 },
      { name: "Laptop Chargers", nameAr: "شواحن اللابتوب", slug: "laptop-chargers", sortOrder: 2 },
      { name: "Screens & Panels", nameAr: "الشاشات واللوحات", slug: "screens-panels", sortOrder: 3 },
      { name: "Keyboards & Palmrests", nameAr: "لوحات مفاتيح ومساند", slug: "keyboards-palmrests", sortOrder: 4 },
      { name: "Fans & Cooling", nameAr: "مراوح وتبريد", slug: "replacement-fans", sortOrder: 5 },
    ],
  },
];

async function seedCategories() {
  const map: Record<string, string> = {};
  async function createTree(nodes: CategorySeed[], parentId: string | null) {
    for (const n of nodes) {
      const cat = await prisma.category.upsert({
        where: { slug: n.slug },
        update: {
          name: n.name,
          nameAr: n.nameAr,
          description: n.description,
          descriptionAr: n.descriptionAr,
          sortOrder: n.sortOrder ?? 0,
          active: true,
          parentId,
        },
        create: {
          name: n.name,
          nameAr: n.nameAr,
          slug: n.slug,
          description: n.description,
          descriptionAr: n.descriptionAr,
          sortOrder: n.sortOrder ?? 0,
          parentId,
        },
      });
      map[n.slug] = cat.id;
      if (n.children) await createTree(n.children, cat.id);
    }
  }
  await createTree(categoryTree, null);
  return map;
}

type AttributeSeed = {
  name: string;
  nameAr: string;
  slug: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";
  unit?: string;
  options?: string[];
  filterable?: boolean;
  required?: boolean;
  categorySlug?: string;
  sortOrder?: number;
};

const attributeSeeds: AttributeSeed[] = [
  { name: "Screen Size", nameAr: "حجم الشاشة", slug: "screen-size", type: "SELECT", unit: "inch", options: ["13.3", "14", "15.6", "16", "17.3"], filterable: true, categorySlug: "laptops" },
  { name: "Processor", nameAr: "المعالج", slug: "processor", type: "TEXT", filterable: true, categorySlug: "laptops" },
  { name: "RAM", nameAr: "الذاكرة", slug: "ram", type: "SELECT", options: ["8GB", "16GB", "32GB", "64GB"], filterable: true, categorySlug: "laptops" },
  { name: "Storage", nameAr: "التخزين", slug: "storage", type: "SELECT", options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"], filterable: true, categorySlug: "laptops" },
  { name: "Graphics", nameAr: "كرت الشاشة", slug: "graphics", type: "TEXT", categorySlug: "laptops" },
  { name: "Operating System", nameAr: "نظام التشغيل", slug: "os", type: "SELECT", options: ["Windows 11 Home", "Windows 11 Pro", "Ubuntu", "No OS"], filterable: true, categorySlug: "laptops" },
  { name: "Resolution", nameAr: "الدقة", slug: "resolution", type: "SELECT", options: ["FHD (1920x1080)", "2.5K (2560x1600)", "4K (3840x2160)"], filterable: true, categorySlug: "laptops" },
  { name: "Refresh Rate", nameAr: "معدل التحديث", slug: "refresh-rate", type: "SELECT", unit: "Hz", options: ["60Hz", "120Hz", "144Hz", "165Hz", "240Hz"], filterable: true, categorySlug: "laptops" },

  { name: "CPU Socket", nameAr: "مقبس المعالج", slug: "cpu-socket", type: "SELECT", options: ["AM5", "AM4", "LGA1700", "LGA1851", "LGA1200"], filterable: true, categorySlug: "processors" },
  { name: "Cores", nameAr: "النوى", slug: "cores", type: "SELECT", options: ["4", "6", "8", "12", "16", "24"], filterable: true, categorySlug: "processors" },
  { name: "Base Clock", nameAr: "التردد الأساسي", slug: "base-clock", type: "TEXT", unit: "GHz", categorySlug: "processors" },

  { name: "GPU Memory", nameAr: "ذاكرة كرت الشاشة", slug: "gpu-memory", type: "SELECT", options: ["8GB", "12GB", "16GB", "24GB"], filterable: true, categorySlug: "graphics-cards" },
  { name: "Interface", nameAr: "الواجهة", slug: "interface", type: "SELECT", options: ["PCIe 4.0", "PCIe 5.0", "USB-C", "SATA III", "M.2 NVMe"], filterable: true, categorySlug: "components" },

  { name: "Memory Type", nameAr: "نوع الذاكرة", slug: "memory-type", type: "SELECT", options: ["DDR4", "DDR5"], filterable: true, categorySlug: "memory-ram" },
  { name: "Capacity", nameAr: "السعة", slug: "capacity", type: "SELECT", options: ["8GB", "16GB", "32GB", "64GB", "256GB", "512GB", "1TB", "2TB"], filterable: true, categorySlug: "components" },
  { name: "Speed", nameAr: "السرعة", slug: "speed", type: "TEXT", unit: "MHz", categorySlug: "components" },

  { name: "Form Factor", nameAr: "عامل الشكل", slug: "form-factor", type: "SELECT", options: ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX", "M.2 2280", "2.5 inch"], filterable: true, categorySlug: "components" },
  { name: "Wattage", nameAr: "القدرة", slug: "wattage", type: "SELECT", unit: "W", options: ["450W", "550W", "650W", "750W", "850W", "1000W"], filterable: true, categorySlug: "power-supplies" },
  { name: "Efficiency", nameAr: "الكفاءة", slug: "efficiency", type: "SELECT", options: ["80+ Bronze", "80+ Gold", "80+ Platinum", "80+ Titanium"], filterable: true, categorySlug: "power-supplies" },

  { name: "Condition", nameAr: "الحالة", slug: "condition", type: "SELECT", options: ["New", "Refurbished", "Open Box"], filterable: true, sortOrder: 99 },
  { name: "Compatible Brand", nameAr: "العلامة المتوافقة", slug: "compatible-brand", type: "TEXT", categorySlug: "spare-parts" },
];

async function seedAttributes(categoryIds: Record<string, string>) {
  const map: Record<string, string> = {};
  for (const a of attributeSeeds) {
    const attr = await prisma.attribute.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        nameAr: a.nameAr,
        type: a.type,
        unit: a.unit,
        options: a.options ? JSON.parse(JSON.stringify(a.options)) : undefined,
        filterable: a.filterable ?? false,
        required: a.required ?? false,
        sortOrder: a.sortOrder ?? 0,
        categoryId: a.categorySlug ? categoryIds[a.categorySlug] : null,
      },
      create: {
        name: a.name,
        nameAr: a.nameAr,
        slug: a.slug,
        type: a.type,
        unit: a.unit,
        options: a.options ? JSON.parse(JSON.stringify(a.options)) : undefined,
        filterable: a.filterable ?? false,
        required: a.required ?? false,
        sortOrder: a.sortOrder ?? 0,
        categoryId: a.categorySlug ? categoryIds[a.categorySlug] : null,
      },
    });
    map[a.slug] = attr.id;
  }
  return map;
}

type ProductSeed = {
  categorySlug: string;
  vendorKey: string;
  name: string;
  nameAr: string;
  brand: string;
  model?: string;
  price: number; // EGP
  compareAtPrice?: number;
  stock: number;
  shortDescription?: string;
  shortDescriptionAr?: string;
  description?: string;
  warranty?: string;
  featured?: boolean;
  status?: ProductStatus;
  specs: Record<string, string>;
  variants?: Array<{ name: string; nameAr?: string; price?: number; stock?: number; options: Record<string, string> }>;
};

const products: ProductSeed[] = [
  {
    categorySlug: "gaming-laptops",
    vendorKey: "ahmed@niletech.eg",
    name: "Asus ROG Strix G16 Gaming Laptop",
    nameAr: "لابتوب Asus ROG Strix G16 للألعاب",
    brand: "Asus",
    model: "G614JV",
    price: 54999,
    compareAtPrice: 58999,
    stock: 8,
    shortDescription: "Intel Core i7-13650HX, RTX 4060, 16GB RAM, 1TB SSD",
    shortDescriptionAr: "Intel Core i7-13650HX، RTX 4060، ذاكرة 16GB، تخزين 1TB",
    description: "A 16-inch gaming powerhouse with a 165Hz QHD display, backlit keyboard and robust thermal design.",
    warranty: "2 years",
    featured: true,
    status: "ACTIVE",
    specs: {
      "screen-size": "16",
      processor: "Intel Core i7-13650HX",
      ram: "16GB",
      storage: "1TB SSD",
      graphics: "NVIDIA RTX 4060 8GB",
      os: "Windows 11 Home",
      resolution: "2.5K (2560x1600)",
      "refresh-rate": "165Hz",
      condition: "New",
    },
  },
  {
    categorySlug: "ultrabooks",
    vendorKey: "ahmed@niletech.eg",
    name: "Apple MacBook Air 13 M3",
    nameAr: "لابتوب Apple MacBook Air 13 M3",
    brand: "Apple",
    model: "M3 / 8GB / 256GB",
    price: 46999,
    stock: 12,
    shortDescription: "Apple M3 chip, 8GB unified memory, 256GB SSD, 13.6-inch Liquid Retina",
    shortDescriptionAr: "شريحة Apple M3، ذاكرة موحدة 8GB، تخزين 256GB، شاشة Liquid Retina 13.6 بوصة",
    warranty: "1 year",
    featured: true,
    status: "ACTIVE",
    specs: {
      "screen-size": "13.3",
      processor: "Apple M3",
      ram: "8GB",
      storage: "256GB SSD",
      graphics: "Apple 10-core GPU",
      os: "macOS Sonoma",
      resolution: "2.5K (2560x1600)",
      condition: "New",
    },
  },
  {
    categorySlug: "business-laptops",
    vendorKey: "ahmed@niletech.eg",
    name: "Lenovo ThinkPad X1 Carbon Gen 12",
    nameAr: "لابتوب Lenovo ThinkPad X1 Carbon Gen 12",
    brand: "Lenovo",
    model: "X1 Carbon G12",
    price: 63999,
    compareAtPrice: 67999,
    stock: 5,
    shortDescription: "Ultra-light business laptop, Intel Core Ultra 7, 16GB RAM, 512GB SSD",
    shortDescriptionAr: "لابتوب أعمال فائق الخفة، Intel Core Ultra 7، ذاكرة 16GB، تخزين 512GB",
    warranty: "3 years",
    status: "ACTIVE",
    specs: {
      "screen-size": "14",
      processor: "Intel Core Ultra 7 155U",
      ram: "16GB",
      storage: "512GB SSD",
      graphics: "Intel Arc Graphics",
      os: "Windows 11 Pro",
      resolution: "2.5K (2560x1600)",
      condition: "New",
    },
  },
  {
    categorySlug: "convertible-laptops",
    vendorKey: "ahmed@niletech.eg",
    name: "HP Spectre x360 2-in-1",
    nameAr: "لابتوب HP Spectre x360 2 في 1",
    brand: "HP",
    model: "16-aa0000",
    price: 43999,
    stock: 6,
    shortDescription: "Convertible with OLED touchscreen, Intel Core Ultra 7, 16GB RAM",
    shortDescriptionAr: "قابل للتحويل بشاشة OLED لمس، Intel Core Ultra 7، ذاكرة 16GB",
    warranty: "2 years",
    status: "ACTIVE",
    specs: {
      "screen-size": "16",
      processor: "Intel Core Ultra 7 155H",
      ram: "16GB",
      storage: "1TB SSD",
      graphics: "Intel Arc Graphics",
      os: "Windows 11 Home",
      resolution: "4K (3840x2160)",
      "refresh-rate": "120Hz",
      condition: "New",
    },
  },
  {
    categorySlug: "gaming-desktops",
    vendorKey: "ahmed@niletech.eg",
    name: "Skytech Gaming Prism II Desktop",
    nameAr: "جهاز ألعاب Skytech Prism II",
    brand: "Skytech",
    model: "Prism II",
    price: 39999,
    stock: 4,
    shortDescription: "Ryzen 7 7700X, RTX 4070, 32GB RAM, 1TB NVMe",
    shortDescriptionAr: "Ryzen 7 7700X، RTX 4070، ذاكرة 32GB، تخزين 1TB NVMe",
    warranty: "1 year",
    featured: true,
    status: "ACTIVE",
    specs: {
      processor: "AMD Ryzen 7 7700X",
      ram: "32GB",
      storage: "1TB SSD",
      graphics: "NVIDIA RTX 4070 12GB",
      os: "Windows 11 Home",
      condition: "New",
    },
  },
  {
    categorySlug: "mini-pcs",
    vendorKey: "ahmed@niletech.eg",
    name: "Intel NUC 13 Pro Mini PC",
    nameAr: "ميني بي سي Intel NUC 13 Pro",
    brand: "Intel",
    model: "NUC13ANH5",
    price: 18999,
    stock: 10,
    shortDescription: "Compact powerhouse, Core i5-1340P, 16GB RAM, 512GB SSD",
    shortDescriptionAr: "جهاز صغير قوي، Core i5-1340P، ذاكرة 16GB، تخزين 512GB",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      processor: "Intel Core i5-1340P",
      ram: "16GB",
      storage: "512GB SSD",
      graphics: "Intel Iris Xe",
      os: "Windows 11 Pro",
      condition: "New",
    },
  },
  {
    categorySlug: "processors",
    vendorKey: "sara@caitech.eg",
    name: "AMD Ryzen 7 7800X3D Processor",
    nameAr: "معالج AMD Ryzen 7 7800X3D",
    brand: "AMD",
    model: "7800X3D",
    price: 21999,
    stock: 20,
    shortDescription: "8 cores, 16 threads, up to 5.0 GHz, best-in-class gaming CPU",
    shortDescriptionAr: "8 نوى، 16 خيط، حتى 5.0 جيجاهرتز، أفضل معالج للألعاب",
    warranty: "3 years",
    featured: true,
    status: "ACTIVE",
    specs: {
      "cpu-socket": "AM5",
      cores: "8",
      "base-clock": "4.2",
      condition: "New",
    },
  },
  {
    categorySlug: "processors",
    vendorKey: "sara@caitech.eg",
    name: "Intel Core i9-14900K Processor",
    nameAr: "معالج Intel Core i9-14900K",
    brand: "Intel",
    model: "i9-14900K",
    price: 26999,
    stock: 10,
    shortDescription: "24 cores (8P+16E), up to 6.0 GHz, unlocked for overclocking",
    shortDescriptionAr: "24 نواة (8P+16E)، حتى 6.0 جيجاهرتز، مفتوح لرفع السرعة",
    warranty: "3 years",
    status: "ACTIVE",
    specs: {
      "cpu-socket": "LGA1700",
      cores: "24",
      "base-clock": "3.2",
      condition: "New",
    },
  },
  {
    categorySlug: "graphics-cards",
    vendorKey: "sara@caitech.eg",
    name: "NVIDIA GeForce RTX 4070 Super",
    nameAr: "كرت شاشة NVIDIA RTX 4070 Super",
    brand: "NVIDIA",
    model: "RTX 4070 Super",
    price: 32999,
    compareAtPrice: 34999,
    stock: 12,
    shortDescription: "12GB GDDR6X, DLSS 3.5, Ada Lovelace architecture",
    shortDescriptionAr: "ذاكرة 12GB GDDR6X، تقنية DLSS 3.5، معمارية Ada Lovelace",
    warranty: "2 years",
    featured: true,
    status: "ACTIVE",
    specs: {
      "gpu-memory": "12GB",
      interface: "PCIe 4.0",
      condition: "New",
    },
  },
  {
    categorySlug: "graphics-cards",
    vendorKey: "sara@caitech.eg",
    name: "AMD Radeon RX 7900 XTX",
    nameAr: "كرت شاشة AMD Radeon RX 7900 XTX",
    brand: "AMD",
    model: "RX 7900 XTX",
    price: 46999,
    stock: 6,
    shortDescription: "24GB GDDR6, RDNA 3, 4K gaming ready",
    shortDescriptionAr: "ذاكرة 24GB GDDR6، معمارية RDNA 3، جاهز لألعاب 4K",
    warranty: "2 years",
    status: "ACTIVE",
    specs: {
      "gpu-memory": "24GB",
      interface: "PCIe 4.0",
      condition: "New",
    },
  },
  {
    categorySlug: "motherboards",
    vendorKey: "sara@caitech.eg",
    name: "ASUS ROG Strix X670E-E Motherboard",
    nameAr: "لوحة أم ASUS ROG Strix X670E-E",
    brand: "ASUS",
    model: "X670E-E",
    price: 24999,
    stock: 7,
    shortDescription: "AM5, DDR5, PCIe 5.0, Wi-Fi 6E, premium VRM",
    shortDescriptionAr: "مقبس AM5، DDR5، PCIe 5.0، واي فاي 6E، VRM فاخر",
    warranty: "3 years",
    status: "ACTIVE",
    specs: {
      "cpu-socket": "AM5",
      "form-factor": "ATX",
      "memory-type": "DDR5",
      condition: "New",
    },
  },
  {
    categorySlug: "memory-ram",
    vendorKey: "sara@caitech.eg",
    name: "Corsair Vengeance 32GB DDR5 6000MHz",
    nameAr: "ذاكرة Corsair Vengeance 32GB DDR5 6000MHz",
    brand: "Corsair",
    model: "CMK32GX5M2B6000C36",
    price: 5999,
    stock: 30,
    shortDescription: "2x16GB kit, 6000MHz CL36, RGB",
    shortDescriptionAr: "مجموعة 2x16GB، 6000MHz CL36، إضاءة RGB",
    warranty: "Lifetime",
    featured: true,
    status: "ACTIVE",
    specs: {
      "memory-type": "DDR5",
      capacity: "32GB",
      speed: "6000",
      condition: "New",
    },
  },
  {
    categorySlug: "storage",
    vendorKey: "sara@caitech.eg",
    name: "Samsung 990 Pro 1TB NVMe SSD",
    nameAr: "قرص Samsung 990 Pro 1TB NVMe SSD",
    brand: "Samsung",
    model: "MZ-V9P1T0BW",
    price: 7999,
    compareAtPrice: 8999,
    stock: 25,
    shortDescription: "PCIe 4.0, up to 7450 MB/s read, superb endurance",
    shortDescriptionAr: "PCIe 4.0، قراءة حتى 7450 ميجابايت/ثانية، عمر تشغيلي ممتاز",
    warranty: "5 years",
    status: "ACTIVE",
    specs: {
      interface: "M.2 NVMe",
      capacity: "1TB",
      "form-factor": "M.2 2280",
      condition: "New",
    },
  },
  {
    categorySlug: "power-supplies",
    vendorKey: "sara@caitech.eg",
    name: "Corsair RM850x 850W PSU",
    nameAr: "مزود طاقة Corsair RM850x 850W",
    brand: "Corsair",
    model: "CP-9020200-EU",
    price: 6999,
    stock: 15,
    shortDescription: "Fully modular, 80+ Gold, zero-RPM fan mode",
    shortDescriptionAr: "قابل للتوصيل الكامل، 80+ Gold، وضع مروحة صامت",
    warranty: "10 years",
    status: "ACTIVE",
    specs: {
      wattage: "850W",
      efficiency: "80+ Gold",
      "form-factor": "ATX",
      condition: "New",
    },
  },
  {
    categorySlug: "pc-cases",
    vendorKey: "sara@caitech.eg",
    name: "Lian Li O11 Dynamic EVO Case",
    nameAr: "شاسيه Lian Li O11 Dynamic EVO",
    brand: "Lian Li",
    model: "O11DE-X",
    price: 8999,
    stock: 9,
    shortDescription: "Mid-tower, tempered glass, excellent airflow",
    shortDescriptionAr: "برج متوسط، زجاج مقسى، تهوية ممتازة",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      "form-factor": "ATX",
      condition: "New",
    },
  },
  {
    categorySlug: "cooling",
    vendorKey: "sara@caitech.eg",
    name: "Noctua NH-D15 Cooler",
    nameAr: "مبرد Noctua NH-D15",
    brand: "Noctua",
    model: "NH-D15",
    price: 4499,
    stock: 14,
    shortDescription: "Dual tower air cooler, silent, top-tier cooling",
    shortDescriptionAr: "مبرد هوائي مزدوج البرج، صامت، تبريد من الطراز الأول",
    warranty: "6 years",
    status: "ACTIVE",
    specs: {
      "form-factor": "ATX",
      condition: "New",
    },
  },
  {
    categorySlug: "monitors",
    vendorKey: "omar@digiparts.eg",
    name: "LG UltraGear 27\" 240Hz QHD Monitor",
    nameAr: "شاشة LG UltraGear 27 بوصة 240Hz QHD",
    brand: "LG",
    model: "27GR83Q",
    price: 14999,
    stock: 18,
    shortDescription: "27-inch QHD IPS, 240Hz, 1ms, HDR400, G-Sync compatible",
    shortDescriptionAr: "شاشة 27 بوصة QHD IPS، 240Hz، 1ms، HDR400، متوافقة مع G-Sync",
    warranty: "3 years",
    featured: true,
    status: "ACTIVE",
    specs: {
      "screen-size": "27",
      resolution: "2.5K (2560x1600)",
      "refresh-rate": "240Hz",
      condition: "New",
    },
  },
  {
    categorySlug: "keyboards",
    vendorKey: "omar@digiparts.eg",
    name: "Keychron K8 Pro Mechanical Keyboard",
    nameAr: "لوحة مفاتيح Keychron K8 Pro ميكانيكية",
    brand: "Keychron",
    model: "K8 Pro",
    price: 3999,
    stock: 22,
    shortDescription: "Wireless, hot-swappable Gateron switches, QMK/VIA",
    shortDescriptionAr: "لاسلكية، مفاتيح Gateron قابلة للاستبدال، دعم QMK/VIA",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      condition: "New",
    },
  },
  {
    categorySlug: "mice",
    vendorKey: "omar@digiparts.eg",
    name: "Logitech G Pro X Superlight 2",
    nameAr: "ماوس Logitech G Pro X Superlight 2",
    brand: "Logitech",
    model: "GPW2",
    price: 6499,
    stock: 20,
    shortDescription: "60g ultralight, HERO 2 sensor, 32K DPI",
    shortDescriptionAr: "خفيف للغاية 60 جرام، مستشعر HERO 2، دقة 32K DPI",
    warranty: "2 years",
    status: "ACTIVE",
    specs: {
      condition: "New",
    },
  },
  {
    categorySlug: "headphones",
    vendorKey: "omar@digiparts.eg",
    name: "Sony WH-1000XM5 Headphones",
    nameAr: "سماعات Sony WH-1000XM5",
    brand: "Sony",
    model: "WH-1000XM5",
    price: 17999,
    stock: 11,
    shortDescription: "Industry-leading noise cancellation, 30h battery",
    shortDescriptionAr: "إلغاء ضوضاء رائد، بطارية 30 ساعة",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      condition: "New",
    },
  },
  {
    categorySlug: "laptop-bags",
    vendorKey: "omar@digiparts.eg",
    name: "Targus 15.6\" Laptop Backpack",
    nameAr: "حقيبة ظهر Targus للابتوب 15.6 بوصة",
    brand: "Targus",
    model: "TBB598",
    price: 1299,
    stock: 35,
    shortDescription: "Water-resistant, padded 15.6-inch laptop compartment",
    shortDescriptionAr: "مقاومة للماء، حجرة مبطنة للابتوب 15.6 بوصة",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      condition: "New",
    },
  },
  {
    categorySlug: "laptop-batteries",
    vendorKey: "omar@digiparts.eg",
    name: "Dell Inspiron 15 Battery (11.1V 42Wh)",
    nameAr: "بطارية Dell Inspiron 15 (11.1V 42Wh)",
    brand: "Dell",
    model: "451-BBEF",
    price: 1899,
    stock: 16,
    shortDescription: "Genuine replacement battery for Dell Inspiron 15 series",
    shortDescriptionAr: "بطارية استبدال أصلية لسلسلة Dell Inspiron 15",
    warranty: "6 months",
    status: "ACTIVE",
    specs: {
      "compatible-brand": "Dell",
      condition: "New",
    },
  },
  {
    categorySlug: "laptop-chargers",
    vendorKey: "omar@digiparts.eg",
    name: "HP 65W USB-C Laptop Charger",
    nameAr: "شاحن HP 65W USB-C للابتوب",
    brand: "HP",
    model: "L48243-001",
    price: 999,
    stock: 28,
    shortDescription: "65W USB-C fast charger, universal for HP laptops",
    shortDescriptionAr: "شاحن سريع 65W USB-C، متوافق مع لابتوبات HP",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      "compatible-brand": "HP",
      condition: "New",
    },
  },
  {
    categorySlug: "screens-panels",
    vendorKey: "omar@digiparts.eg",
    name: "ASUS VivoBook 15.6\" FHD LCD Screen",
    nameAr: "شاشة LCD مقاس 15.6 بوصة لـ ASUS VivoBook",
    brand: "ASUS",
    model: "N156HCA-EA4",
    price: 1499,
    stock: 9,
    shortDescription: "Replacement 15.6-inch FHD panel with LED connector",
    shortDescriptionAr: "لوحة استبدال 15.6 بوصة FHD مع موصل LED",
    warranty: "6 months",
    status: "ACTIVE",
    specs: {
      "compatible-brand": "ASUS",
      condition: "New",
    },
  },
  {
    categorySlug: "keyboards-palmrests",
    vendorKey: "omar@digiparts.eg",
    name: "Lenovo IdeaPad Keyboard + Palmrest Assembly",
    nameAr: "لوحة مفاتيح ومسند يد Lenovo IdeaPad",
    brand: "Lenovo",
    model: "5CB0W45180",
    price: 1799,
    stock: 7,
    shortDescription: "Backlit keyboard and palmrest assembly for IdeaPad 3 series",
    shortDescriptionAr: "لوحة مفاتيح مضيئة ومسند يد لسلسلة IdeaPad 3",
    warranty: "6 months",
    status: "ACTIVE",
    specs: {
      "compatible-brand": "Lenovo",
      condition: "New",
    },
  },
  {
    categorySlug: "replacement-fans",
    vendorKey: "omar@digiparts.eg",
    name: "Cooling Fan + Heatsink for Acer Aspire",
    nameAr: "مروحة تبريد ومشتت حراري لـ Acer Aspire",
    brand: "Acer",
    model: "FK1R13",
    price: 1399,
    stock: 13,
    shortDescription: "Genuine cooling fan assembly for Acer Aspire 5 series",
    shortDescriptionAr: "مجموعة مروحة تبريد أصلية لسلسلة Acer Aspire 5",
    warranty: "6 months",
    status: "ACTIVE",
    specs: {
      "compatible-brand": "Acer",
      condition: "New",
    },
  },
  {
    categorySlug: "prebuilt-desktops",
    vendorKey: "ahmed@niletech.eg",
    name: "Dell OptiPlex 7010 Desktop",
    nameAr: "جهاز Dell OptiPlex 7010",
    brand: "Dell",
    model: "7010 SFF",
    price: 16999,
    stock: 8,
    shortDescription: "Core i7-13700, 16GB RAM, 512GB SSD, SFF",
    shortDescriptionAr: "Core i7-13700، ذاكرة 16GB، تخزين 512GB، هيكل صغير",
    warranty: "1 year",
    status: "ACTIVE",
    specs: {
      processor: "Intel Core i7-13700",
      ram: "16GB",
      storage: "512GB SSD",
      os: "Windows 11 Pro",
      condition: "New",
    },
  },
];

async function seedProducts(
  vendorIds: Record<string, string>,
  categoryIds: Record<string, string>,
  attributeIds: Record<string, string>,
) {
  const vendorCache = new Map<string, { id: string; commissionRate: number | null }>();
  for (const v of Object.values(vendorIds)) {
    const vendor = await prisma.vendor.findUnique({ where: { id: v } });
    vendorCache.set(v, vendor as never);
  }

  for (const p of products) {
    const vendorId = vendorIds[p.vendorKey];
    const categoryId = categoryIds[p.categorySlug];
    if (!vendorId || !categoryId) {
      console.warn(`skip ${p.name}: missing vendor/category`);
      continue;
    }
    const baseSlug = slugify(p.name);
    const slug = `${baseSlug}-${generateUniqueSuffix()}`;
    const searchTerms = `${p.name} ${p.nameAr} ${p.brand} ${p.model ?? ""}`.toLowerCase();

    const existing = await prisma.product.findFirst({
      where: { name: p.name, vendorId },
      select: { id: true },
    });
    if (existing) {
      console.log(`skip existing: ${p.name}`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId,
        name: p.name,
        nameAr: p.nameAr,
        slug,
        brand: p.brand,
        model: p.model,
        shortDescription: p.shortDescription,
        shortDescriptionAr: p.shortDescriptionAr,
        description: p.description,
        warranty: p.warranty,
        status: p.status ?? "ACTIVE",
        featured: p.featured ?? false,
        searchTerms,
        totalStock: p.variants
          ? p.variants.reduce((a, v) => a + (v.stock ?? p.stock), 0)
          : p.stock,
      },
    });

    const specEntries = Object.entries(p.specs);

    // Attributes
    for (const [attrSlug, value] of specEntries) {
      const attributeId = attributeIds[attrSlug];
      if (!attributeId) continue;
      await prisma.productAttributeValue.create({
        data: { productId: product.id, attributeId, value },
      });
    }

    // Variants
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        const price = toMinor(v.price ?? p.price);
        await prisma.variant.create({
          data: {
            productId: product.id,
            sku: `${slugify(p.brand)}-${v.name.replace(/[^a-z0-9]/gi, "") || "std"}-${generateUniqueSuffix()}`.toUpperCase(),
            name: v.name,
            price,
            compareAtPrice: p.compareAtPrice ? toMinor(p.compareAtPrice) : null,
            stock: v.stock ?? p.stock,
            options: v.options,
          },
        });
      }
    } else {
      await prisma.variant.create({
        data: {
          productId: product.id,
          sku: `${slugify(p.brand)}-${p.model ? slugify(p.model) : "std"}-${generateUniqueSuffix()}`.toUpperCase(),
          name: "Standard",
          price: toMinor(p.price),
          compareAtPrice: p.compareAtPrice ? toMinor(p.compareAtPrice) : null,
          stock: p.stock,
        },
      });
    }

    // Images
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: placeholderUrl(p.name),
        alt: p.name,
        position: 0,
        isPrimary: true,
      },
    });
    await prisma.productImage.create({
      data: { productId: product.id, url: placeholderUrl(`${p.name} 2`), alt: p.name, position: 1 },
    });
  }
}

async function seedDemoData(
  userIds: Record<string, string>,
  vendorIds: Record<string, string>,
) {
  const customerId = userIds["yasmine@example.com"];
  const vendor1 = vendorIds["ahmed@niletech.eg"];
  const vendor2 = vendorIds["sara@caitech.eg"];

  const existingTicket = await prisma.supportTicket.findUnique({
    where: { ticketNumber: "TKT-0001" },
    select: { id: true },
  });
  const existingOrder = await prisma.order.findFirst({
    where: { userId: customerId },
    select: { id: true },
  });
  if (existingTicket || existingOrder) {
    console.log("Demo data already present, skipping demo seed.");
    return;
  }

  const productOf = async (name: string) => {
    return prisma.product.findFirstOrThrow({
      where: { name },
      include: { variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
    });
  };

  const gpu = await productOf("NVIDIA GeForce RTX 4070 Super");
  const cpu = await productOf("AMD Ryzen 7 7800X3D Processor");
  const laptop = await productOf("Asus ROG Strix G16 Gaming Laptop");
  const monitor = await productOf('LG UltraGear 27" 240Hz QHD Monitor');
  const ram = await productOf("Corsair Vengeance 32GB DDR5 6000MHz");
  const mouse = await productOf("Logitech G Pro X Superlight 2");

  // Address for customer
  const address = await prisma.address.create({
    data: {
      userId: customerId,
      fullName: "Yasmine Adel",
      phone: "01112345678",
      line1: "24 El-Tahrir Street, Downtown",
      city: "Cairo",
      state: "Cairo",
      country: "Egypt",
      postalCode: "11511",
      isDefault: true,
    },
  });

  const addressSnapshot = {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state ?? "",
    country: address.country,
    postalCode: address.postalCode ?? "",
  };

  const defaultRate = await getDefaultCommissionRate();

  // ----- Order 1: multi-vendor, DELIVERED (settled) -----
  const items1 = [
    { variant: laptop.variants[0]!, product: laptop, qty: 1 },
    { variant: gpu.variants[0]!, product: gpu, qty: 1 },
    { variant: monitor.variants[0]!, product: monitor, qty: 1 },
  ];
  const totals1 = computeOrderTotals(
    items1.map((i) => ({ unitPriceMinor: i.variant.price, quantity: i.qty })),
  );

  const order1 = await prisma.order.create({
    data: {
      orderNumber: nextOrderNumber(),
      userId: customerId,
      status: "DELIVERED",
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      address: addressSnapshot,
      subtotal: totals1.subtotal,
      discount: totals1.discount,
      shippingFee: totals1.shippingFee,
      taxAmount: totals1.taxAmount,
      total: totals1.total,
      placedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      deliveredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    },
  });

  for (const i of items1) {
    const commission = computeItemCommission(i.variant.price, i.qty, defaultRate);
    const vendorId = i.product.vendorId;
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        vendorId,
        productId: i.product.id,
        variantId: i.variant.id,
        productName: i.product.name,
        variantName: i.variant.name,
        sku: i.variant.sku,
        imageUrl: i.product.images[0]?.url ?? null,
        quantity: i.qty,
        unitPrice: i.variant.price,
        lineTotal: i.variant.price * i.qty,
        commissionRate: commission.rate,
        commissionAmount: commission.commissionAmount,
        vendorNet: commission.vendorNet,
        shippingStatus: "DELIVERED",
        deliveredAt: order1.deliveredAt,
      },
    });
    await prisma.product.update({
      where: { id: i.product.id },
      data: { soldCount: { increment: i.qty } },
    });
    // settle funds (already delivered)
    await prisma.wallet.upsert({
      where: { vendorId },
      create: {
        vendorId,
        availableBalance: commission.vendorNet,
        lifetimeEarned: commission.vendorNet,
      },
      update: {
        availableBalance: { increment: commission.vendorNet },
        lifetimeEarned: { increment: commission.vendorNet },
      },
    });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { vendorId } });
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        vendorId,
        type: "ORDER_CREDIT",
        amount: commission.vendorNet,
        balanceAfter: wallet.availableBalance,
        orderItemId: orderItem.id,
        reference: order1.orderNumber,
        description: "Funds settled from delivered order",
      },
    });
  }

  // ----- Order 2: SHIPPED (pending balance) -----
  const items2 = [
    { variant: cpu.variants[0]!, product: cpu, qty: 1 },
    { variant: ram.variants[0]!, product: ram, qty: 2 },
    { variant: mouse.variants[0]!, product: mouse, qty: 1 },
  ];
  const totals2 = computeOrderTotals(
    items2.map((i) => ({ unitPriceMinor: i.variant.price, quantity: i.qty })),
  );
  const order2 = await prisma.order.create({
    data: {
      orderNumber: nextOrderNumber(),
      userId: customerId,
      status: "SHIPPED",
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      address: addressSnapshot,
      subtotal: totals2.subtotal,
      discount: totals2.discount,
      shippingFee: totals2.shippingFee,
      taxAmount: totals2.taxAmount,
      total: totals2.total,
      placedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  });

  const shippedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
  for (const i of items2) {
    const commission = computeItemCommission(i.variant.price, i.qty, defaultRate);
    const vendorId = i.product.vendorId;
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        vendorId,
        productId: i.product.id,
        variantId: i.variant.id,
        productName: i.product.name,
        variantName: i.variant.name,
        sku: i.variant.sku,
        imageUrl: i.product.images[0]?.url ?? null,
        quantity: i.qty,
        unitPrice: i.variant.price,
        lineTotal: i.variant.price * i.qty,
        commissionRate: commission.rate,
        commissionAmount: commission.commissionAmount,
        vendorNet: commission.vendorNet,
        shippingStatus: "SHIPPED",
        trackingNumber: `TRK${randomBytes(5).toString("hex").toUpperCase()}`,
        trackingCarrier: "Aramex",
        shippedAt,
      },
    });
    await prisma.product.update({
      where: { id: i.product.id },
      data: { soldCount: { increment: i.qty } },
    });
    await prisma.wallet.upsert({
      where: { vendorId },
      create: { vendorId, pendingBalance: commission.vendorNet },
      update: { pendingBalance: { increment: commission.vendorNet } },
    });
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { vendorId } });
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        vendorId,
        type: "ORDER_CREDIT",
        amount: commission.vendorNet,
        balanceAfter: wallet.pendingBalance,
        orderItemId: orderItem.id,
        reference: order2.orderNumber,
        description: "Order credit (pending settlement)",
      },
    });
  }

  // ----- Order 3: PENDING payment (COD) -----
  const items3 = [{ variant: mouse.variants[0]!, product: mouse, qty: 1 }];
  const totals3 = computeOrderTotals(
    items3.map((i) => ({ unitPriceMinor: i.variant.price, quantity: i.qty })),
  );
  const order3 = await prisma.order.create({
    data: {
      orderNumber: nextOrderNumber(),
      userId: customerId,
      status: "PENDING",
      paymentStatus: "UNPAID",
      paymentMethod: "COD",
      address: addressSnapshot,
      subtotal: totals3.subtotal,
      discount: totals3.discount,
      shippingFee: totals3.shippingFee,
      taxAmount: totals3.taxAmount,
      total: totals3.total,
      placedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
  });

  for (const i of items3) {
    const commission = computeItemCommission(i.variant.price, i.qty, defaultRate);
    await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        vendorId: i.product.vendorId,
        productId: i.product.id,
        variantId: i.variant.id,
        productName: i.product.name,
        variantName: i.variant.name,
        sku: i.variant.sku,
        imageUrl: i.product.images[0]?.url ?? null,
        quantity: i.qty,
        unitPrice: i.variant.price,
        lineTotal: i.variant.price * i.qty,
        commissionRate: commission.rate,
        commissionAmount: commission.commissionAmount,
        vendorNet: commission.vendorNet,
      },
    });
    await prisma.product.update({
      where: { id: i.product.id },
      data: { soldCount: { increment: i.qty } },
    });
  }

  // ----- Reviews -----
  const reviews: Array<{
    userId: string;
    productId: string;
    orderItemId?: string;
    rating: number;
    title: string;
    body: string;
    verified: boolean;
    pending?: boolean;
  }> = [
    {
      userId: customerId,
      productId: gpu.id,
      orderItemId: (await prisma.orderItem.findFirstOrThrow({ where: { productId: gpu.id } })).id,
      rating: 5,
      title: "Outstanding 1440p card",
      body: "Quiet, cool and incredibly fast. Handles everything at max settings.",
      verified: true,
    },
    {
      userId: customerId,
      productId: laptop.id,
      orderItemId: (await prisma.orderItem.findFirstOrThrow({ where: { productId: laptop.id } })).id,
      rating: 5,
      title: "Beast for gaming",
      body: "The 165Hz display and RTX 4060 make it a joy to use.",
      verified: true,
    },
    {
      userId: userIds["karim@example.com"],
      productId: monitor.id,
      rating: 4,
      title: "Great monitor",
      body: "Colors are vivid and 240Hz feels buttery smooth. Stand is a bit wobbly.",
      verified: false,
    },
    {
      userId: userIds["karim@example.com"],
      productId: cpu.id,
      rating: 5,
      title: "Best gaming CPU",
      body: "Massive gains over my old CPU in games. Runs cool with a good cooler.",
      verified: false,
    },
    {
      userId: userIds["karim@example.com"],
      productId: laptop.id,
      rating: 3,
      title: "Good but loud fans",
      body: "Performance is great but the fans get very loud under load, and the keyboard gets warm.",
      verified: false,
      pending: true,
    },
  ];
  for (const r of reviews) {
    const exists = await prisma.review.findUnique({
      where: { userId_productId: { userId: r.userId, productId: r.productId } },
    });
    if (exists) continue;
    await prisma.review.create({
      data: {
        userId: r.userId,
        productId: r.productId,
        orderItemId: r.orderItemId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.pending ? "PENDING" : "PUBLISHED",
        isVerifiedPurchase: r.verified,
      },
    });
    await prisma.product.update({
      where: { id: r.productId },
      data: {
        ratingCount: { increment: 1 },
      },
    });
    await recomputeRating(r.productId);
  }

  // ----- Vendor review response -----
  const firstReview = await prisma.review.findFirstOrThrow({ where: { productId: gpu.id } });
  await prisma.reviewResponse.upsert({
    where: { reviewId: firstReview.id },
    update: {},
    create: {
      reviewId: firstReview.id,
      vendorId: vendor2,
      body: "Thank you! We are glad you are happy with the card. Happy gaming!",
    },
  });

  // ----- Withdrawal request -----
  const v1Wallet = await prisma.wallet.findUnique({ where: { vendorId: vendor1 } });
  if (v1Wallet && v1Wallet.availableBalance > 0) {
    await prisma.withdrawal.create({
      data: {
        vendorId: vendor1,
        walletId: v1Wallet.id,
        amount: Math.min(v1Wallet.availableBalance, 20000_00),
        status: "PENDING",
        method: "BANK_TRANSFER",
        accountDetails: { bank: "CIB", accountName: "NileTech Store", last4: "4821" },
        requestNote: "Monthly payout",
      },
    });
  }

  // ----- Support ticket -----
  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: "TKT-0001",
      userId: customerId,
      subject: "Where is my order?",
      category: "ORDER",
      priority: "HIGH",
      status: "IN_PROGRESS",
      orderId: order1.id,
    },
  });
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: customerId,
      senderRole: "CUSTOMER",
      body: "I ordered 20 days ago but the tracking link is not working.",
    },
  });
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: userIds["ops@technomarket.eg"],
      senderRole: "ADMIN",
      body: "Hi Yasmine, your order has been delivered. Let me check the tracking and get back to you shortly.",
    },
  });

  // ----- Notifications -----
  await prisma.notification.create({
    data: {
      userId: customerId,
      type: "ORDER",
      title: "Order confirmed",
      body: `Your order ${order1.orderNumber} is on its way.`,
      link: `/account/orders/${order1.id}`,
    },
  });
  await prisma.notification.create({
    data: {
      userId: customerId,
      type: "ORDER",
      title: "Order delivered",
      body: `Order ${order1.orderNumber} has been delivered. Enjoy!`,
      link: `/account/orders/${order1.id}`,
    },
  });
  for (const v of [vendor1, vendor2]) {
    await prisma.notification.create({
      data: {
        vendorId: v,
        type: "ORDER",
        title: "New order received",
        body: `You have items in order ${order2.orderNumber}.`,
        link: "/vendor/orders",
      },
    });
  }

  async function recomputeRating(productId: string) {
    const agg = await prisma.review.aggregate({
      where: { productId, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: agg._avg.rating ?? 0,
        ratingCount: agg._count._all,
      },
    });
  }
}

async function main() {
  console.log("Seeding database...");
  await seedPermissions();
  await seedConfig();
  const userIds = await seedUsers();
  const vendorIds = await seedVendors(userIds);
  const categoryIds = await seedCategories();
  const attributeIds = await seedAttributes(categoryIds);
  await seedProducts(vendorIds, categoryIds, attributeIds);
  await seedDemoData(userIds, vendorIds);
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
