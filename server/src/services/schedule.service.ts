import prisma from '../utils/prisma';

export interface ScheduleInput {
  ledName: string;
  turnOnTime: string;
  turnOffTime: string;
}

export async function getAll() {
  const schedules = await prisma.ledControl.findMany({ orderBy: { id: 'asc' } });

  return schedules.map(s => ({
    id: s.id,
    led_name: s.ledName,
    turn_on_time: s.turnOnTime,
    turn_off_time: s.turnOffTime,
  }));
}

export async function create(input: ScheduleInput) {
  return prisma.ledControl.create({
    data: { ledName: input.ledName, turnOnTime: input.turnOnTime, turnOffTime: input.turnOffTime },
  });
}

export async function update(id: number, input: Partial<ScheduleInput>) {
  return prisma.ledControl.update({
    where: { id },
    data: {
      ...(input.ledName && { ledName: input.ledName }),
      ...(input.turnOnTime && { turnOnTime: input.turnOnTime }),
      ...(input.turnOffTime && { turnOffTime: input.turnOffTime }),
    },
  });
}

export async function remove(id: number) {
  await prisma.ledControl.delete({ where: { id } });
}
