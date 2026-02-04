import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default workstations
  const workstation1 = await prisma.workstation.upsert({
    where: { id: 'ws-1' },
    update: {},
    create: {
      id: 'ws-1',
      name: 'Workstation A',
      description: 'Main inspection workstation',
      isActive: true,
    },
  });

  const workstation2 = await prisma.workstation.upsert({
    where: { id: 'ws-2' },
    update: {},
    create: {
      id: 'ws-2',
      name: 'Workstation B',
      description: 'Secondary inspection workstation',
      isActive: true,
    },
  });

  console.log('Created workstations:', workstation1.name, workstation2.name);

  // Create default defect types
  const defectTypes = [
    { id: 'dt-1', name: 'Skrabance', nameEn: 'Scratch', color: '#EF4444', severity: 2 },
    { id: 'dt-2', name: 'Musle', nameEn: 'Shell', color: '#F97316', severity: 3 },
    { id: 'dt-3', name: 'Strep', nameEn: 'Chip', color: '#EAB308', severity: 4 },
    { id: 'dt-4', name: 'Oder', nameEn: 'Abrasion', color: '#22C55E', severity: 1 },
    { id: 'dt-5', name: 'Bublina', nameEn: 'Bubble', color: '#3B82F6', severity: 2 },
    { id: 'dt-6', name: 'Necistota', nameEn: 'Contamination', color: '#8B5CF6', severity: 1 },
    { id: 'dt-7', name: 'Prasklina', nameEn: 'Crack', color: '#EC4899', severity: 5 },
    { id: 'dt-8', name: 'Deformace', nameEn: 'Deformation', color: '#06B6D4', severity: 3 },
  ];

  for (const dt of defectTypes) {
    await prisma.defectType.upsert({
      where: { id: dt.id },
      update: {},
      create: dt,
    });
  }

  console.log('Created defect types:', defectTypes.length);

  // Create default products
  const products = [
    {
      id: 'prod-1',
      code: 'WS-001',
      name: 'Predni sklo Sedan',
      nameEn: 'Front Windshield Sedan',
      normPerHour: 60,
      templateWidth: 1200,
      templateHeight: 800,
    },
    {
      id: 'prod-2',
      code: 'WS-002',
      name: 'Zadni sklo Sedan',
      nameEn: 'Rear Windshield Sedan',
      normPerHour: 80,
      templateWidth: 1000,
      templateHeight: 600,
    },
    {
      id: 'prod-3',
      code: 'WS-003',
      name: 'Bocni sklo Leve',
      nameEn: 'Side Window Left',
      normPerHour: 100,
      templateWidth: 600,
      templateHeight: 400,
    },
    {
      id: 'prod-4',
      code: 'WS-004',
      name: 'Bocni sklo Prave',
      nameEn: 'Side Window Right',
      normPerHour: 100,
      templateWidth: 600,
      templateHeight: 400,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  console.log('Created products:', products.length);

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@glass-inspector.local' },
    update: {},
    create: {
      email: 'admin@glass-inspector.local',
      passwordHash: adminPasswordHash,
      name: 'Administrator',
      role: Role.ADMIN,
      defaultWorkstationId: workstation1.id,
      workstations: {
        connect: [{ id: workstation1.id }, { id: workstation2.id }],
      },
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create inspector user
  const inspectorPasswordHash = await bcrypt.hash('inspector123', 12);
  const inspectorUser = await prisma.user.upsert({
    where: { email: 'inspector@glass-inspector.local' },
    update: {},
    create: {
      email: 'inspector@glass-inspector.local',
      passwordHash: inspectorPasswordHash,
      name: 'Inspektor 1',
      role: Role.INSPECTOR,
      defaultWorkstationId: workstation1.id,
      workstations: {
        connect: [{ id: workstation1.id }],
      },
    },
  });

  console.log('Created inspector user:', inspectorUser.email);

  // Create quality user
  const qualityPasswordHash = await bcrypt.hash('quality123', 12);
  const qualityUser = await prisma.user.upsert({
    where: { email: 'quality@glass-inspector.local' },
    update: {},
    create: {
      email: 'quality@glass-inspector.local',
      passwordHash: qualityPasswordHash,
      name: 'Kvalita 1',
      role: Role.QUALITY,
      defaultWorkstationId: workstation2.id,
      workstations: {
        connect: [{ id: workstation1.id }, { id: workstation2.id }],
      },
    },
  });

  console.log('Created quality user:', qualityUser.email);

  console.log('Seeding completed!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin:     admin@glass-inspector.local / admin123');
  console.log('  Inspector: inspector@glass-inspector.local / inspector123');
  console.log('  Quality:   quality@glass-inspector.local / quality123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
