import prisma from '../utils/prisma';

async function ensureSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.settings.create({ data: { id: 1, temperatureThreshold: 0 } });
  }
}

export async function getSettings() {
  await ensureSettings();
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  return { temperatureThreshold: row?.temperatureThreshold ?? 0 };
}

export async function updateSettings(temperatureThreshold: number) {
  await ensureSettings();
  await prisma.settings.update({
    where: { id: 1 },
    data: { temperatureThreshold: parseInt(String(temperatureThreshold)) || 0 },
  });
}
