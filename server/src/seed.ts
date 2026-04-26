import prisma from './utils/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Seed default user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { fname: 'Admin', username: 'admin', password: hashedPassword },
  });
  console.log('✅ User: admin / admin123');

  // Seed led_status
  await prisma.ledStatus.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, led1: false, led2: false, led3: false, led4: false },
  });
  console.log('✅ Led status initialized');

  // Seed mode_setting
  await prisma.modeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, mode: 0 },
  });
  console.log('✅ Mode setting initialized');

  // Seed settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, temperatureThreshold: 35 },
  });
  console.log('✅ Settings initialized');

  // Seed led_control (schedules)
  const schedules = [
    { id: 1, ledName: 'LED1', turnOnTime: '08:00', turnOffTime: '18:00' },
    { id: 2, ledName: 'LED2', turnOnTime: '06:00', turnOffTime: '06:30' },
    { id: 3, ledName: 'LED3', turnOnTime: '12:00', turnOffTime: '14:00' },
    { id: 4, ledName: 'LED4', turnOnTime: '18:00', turnOffTime: '22:00' },
  ];
  for (const s of schedules) {
    await prisma.ledControl.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log('✅ Schedules initialized');
  console.log('ℹ️ Sensor data is not seeded. System waits for real ESP32 data.');

  console.log('🎉 Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
