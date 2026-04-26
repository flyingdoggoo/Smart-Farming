import prisma from '../utils/prisma';

type LedKey = 'led1' | 'led2' | 'led3' | 'led4';
const ALLOWED_LEDS: LedKey[] = ['led1', 'led2', 'led3', 'led4'];

async function ensureLedStatus() {
  const existing = await prisma.ledStatus.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.ledStatus.create({
      data: { id: 1, led1: false, led2: false, led3: false, led4: false },
    });
  }
}

function validateLedName(name: string): LedKey {
  if (!ALLOWED_LEDS.includes(name as LedKey)) {
    throw { status: 400, message: 'Invalid led name' };
  }
  return name as LedKey;
}

export async function getAllRelayStatus() {
  await ensureLedStatus();
  const row = await prisma.ledStatus.findUnique({ where: { id: 1 } });

  return {
    led1: row?.led1 ? 1 : 0,
    led2: row?.led2 ? 1 : 0,
    led3: row?.led3 ? 1 : 0,
    led4: row?.led4 ? 1 : 0,
    updated_at: row?.updatedAt ?? null,
  };
}

export async function toggleRelay(name: string, status: boolean) {
  await ensureLedStatus();
  const key = validateLedName(name);

  await prisma.ledStatus.update({
    where: { id: 1 },
    data: { [key]: status },
  });

  return { led: name, status: status ? 1 : 0 };
}
