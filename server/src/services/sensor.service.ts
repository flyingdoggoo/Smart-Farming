import prisma from '../utils/prisma';

export interface SensorInput {
  soilTemperature: number;
  soilHumidity: number;
  soilConductivity: number;
  soilPH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  lux?: number | null;
  voltageV?: number | null;
  busVoltageV?: number | null;
  shuntVoltageMv?: number | null;
  currentA?: number | null;
  powerW?: number | null;
  activeRelays?: number;
}

async function fetchLatestRow() {
  return prisma.sensorData.findFirst({
    orderBy: { regDate: 'desc' },
  });
}

export async function getLatest() {
  const data = await fetchLatestRow();

  if (!data) {
    return {
      temp: null, humi: null, ec: null, ph: null,
      nitrogen: null, phosphorus: null, potassium: null,
      lux: null, voltageV: null, busVoltageV: null,
      shuntVoltageMv: null, currentA: null, powerW: null,
      activeRelays: 0, last_reading_time: null,
    };
  }

  return {
    id: data.id,
    temp: data.soilTemperature,
    humi: data.soilHumidity,
    ec: data.soilConductivity,
    ph: data.soilPH,
    nitrogen: data.nitrogen,
    phosphorus: data.phosphorus,
    potassium: data.potassium,
    lux: data.lux,
    voltageV: data.voltageV,
    busVoltageV: data.busVoltageV,
    shuntVoltageMv: data.shuntVoltageMv,
    currentA: data.currentA,
    powerW: data.powerW,
    activeRelays: data.activeRelays,
    last_reading_time: data.regDate,
  };
}

export async function getLatestLegacySensorData() {
  const data = await fetchLatestRow();

  if (!data) {
    return {
      id: null,
      soilTemperature: null,
      soilHumidity: null,
      soilConductivity: null,
      soilPH: null,
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      lux: null,
      voltageV: null,
      busVoltageV: null,
      shuntVoltageMv: null,
      currentA: null,
      powerW: null,
      activeRelays: null,
      reg_date: null,
    };
  }

  return {
    id: data.id,
    soilTemperature: data.soilTemperature,
    soilHumidity: data.soilHumidity,
    soilConductivity: data.soilConductivity,
    soilPH: data.soilPH,
    nitrogen: data.nitrogen,
    phosphorus: data.phosphorus,
    potassium: data.potassium,
    lux: data.lux,
    voltageV: data.voltageV,
    busVoltageV: data.busVoltageV,
    shuntVoltageMv: data.shuntVoltageMv,
    currentA: data.currentA,
    powerW: data.powerW,
    activeRelays: data.activeRelays,
    reg_date: data.regDate,
  };
}

export async function getHistory(limit: number, days: number) {
  const safeLimit = Math.min(limit || 40, 500);
  const where = days > 0
    ? { regDate: { gte: new Date(Date.now() - days * 86400000) } }
    : {};

  const rows = await prisma.sensorData.findMany({
    where,
    orderBy: { regDate: 'desc' },
    take: safeLimit,
  });

  rows.reverse();

  return {
    reg_date: rows.map(r => r.regDate),
    soilTemperature: rows.map(r => r.soilTemperature),
    soilHumidity: rows.map(r => r.soilHumidity),
    soilConductivity: rows.map(r => r.soilConductivity),
    soilPH: rows.map(r => r.soilPH),
    nitrogen: rows.map(r => r.nitrogen),
    phosphorus: rows.map(r => r.phosphorus),
    potassium: rows.map(r => r.potassium),
    lux: rows.map(r => r.lux),
    voltageV: rows.map(r => r.voltageV),
    busVoltageV: rows.map(r => r.busVoltageV),
    shuntVoltageMv: rows.map(r => r.shuntVoltageMv),
    currentA: rows.map(r => r.currentA),
    powerW: rows.map(r => r.powerW),
    activeRelays: rows.map(r => r.activeRelays),
  };
}

export async function getTable(page: number, perPage: number, sortField: string, sortOrder: 'asc' | 'desc') {
  const safePage = Math.max(1, page);
  const safePerPage = Math.min(perPage || 50, 100);

  const [total, rows] = await Promise.all([
    prisma.sensorData.count(),
    prisma.sensorData.findMany({
      orderBy: { [sortField || 'regDate']: sortOrder },
      skip: (safePage - 1) * safePerPage,
      take: safePerPage,
    }),
  ]);

  return {
    data: rows,
    pagination: { page: safePage, perPage: safePerPage, total, totalPages: Math.ceil(total / safePerPage) },
  };
}

export async function insertSensorData(input: SensorInput) {
  return prisma.sensorData.create({
    data: {
      soilTemperature: input.soilTemperature,
      soilHumidity: input.soilHumidity,
      soilConductivity: input.soilConductivity,
      soilPH: input.soilPH,
      nitrogen: input.nitrogen,
      phosphorus: input.phosphorus,
      potassium: input.potassium,
      lux: input.lux ?? null,
      voltageV: input.voltageV ?? null,
      busVoltageV: input.busVoltageV ?? null,
      shuntVoltageMv: input.shuntVoltageMv ?? null,
      currentA: input.currentA ?? null,
      powerW: input.powerW ?? null,
      activeRelays: input.activeRelays ?? 0,
    },
  });
}
