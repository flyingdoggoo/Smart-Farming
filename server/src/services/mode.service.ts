import prisma from '../utils/prisma';

async function ensureModeSetting() {
  const existing = await prisma.modeSetting.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.modeSetting.create({ data: { id: 1, mode: 0 } });
  }
}

export async function getMode() {
  await ensureModeSetting();
  const row = await prisma.modeSetting.findUnique({ where: { id: 1 } });
  return row?.mode ?? 0;
}

export async function updateMode(mode: number) {
  await ensureModeSetting();
  const modeValue = mode === 1 ? 1 : 0;

  await prisma.modeSetting.update({
    where: { id: 1 },
    data: { mode: modeValue },
  });

  return modeValue;
}
