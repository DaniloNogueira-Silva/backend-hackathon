export type GenAIFunctionDeclaration = {
  name: string;
  description?: string;
  parameters?: any;
};

export type GenAITool = {
  functionDeclarations: GenAIFunctionDeclaration[];
};

export function extractText(resp: any): string {
  if (!resp?.response?.candidates?.length) return '';
  const parts = resp.response.candidates[0]?.content?.parts ?? [];
  return parts
    .map((p: any) => p.text || '')
    .join('\n')
    .trim();
}

export function extractFunctionCall(resp: any): any | null {
  if (!resp?.response?.candidates?.length) return null;
  const parts = resp.response.candidates[0]?.content?.parts ?? [];
  const fcPart = parts.find((p: any) => p.functionCall);
  return fcPart?.functionCall ?? null;
}

export const findMedicoDeclaration: GenAIFunctionDeclaration = {
  name: 'findByNomeOuEspecialidade',
  description:
    'Busca médicos no banco por nome ou especialidade para agendamento (ex.: "oftalmo", "cardiologista", "Dr. João").',
  parameters: {
    type: 'OBJECT',
    properties: {
      termo: {
        type: 'STRING',
        description:
          'Nome do médico ou especialidade (ex.: "oftalmo", "pediatra", "Dr. Silva").',
      },
    },
    required: ['termo'],
  },
};

export const buscaMedicoTool: GenAITool = {
  functionDeclarations: [findMedicoDeclaration],
};

/** ========= Helpers de data/hora (local, America/Sao_Paulo) ========= */
const DEFAULT_TZ = 'America/Sao_Paulo';

// Converte Date/string para chave "YYYY-MM-DD HH" no fuso informado
function toKeyTZ(d: Date | string, timeZone = DEFAULT_TZ): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(d as any));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day} ${map.hour}`;
}

// Normaliza um Date para o início da hora (min=0, sec=0, ms=0)
export function normalizeToHour(d: Date): Date {
  const nd = new Date(d);
  nd.setMinutes(0, 0, 0);
  return nd;
}

// Compara se duas datas são no MESMO ano/mês/dia/hora (ignora min/seg)
export function sameHour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours()
  );
}

// Formata para "YYYY-MM-DD"
export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Formata hora "HH:mm"
export function formatHM(d: Date): string {
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

/** ========= Geração de Slots =========
 * Gera slots apenas em dias úteis (seg→sex), começando às 08:00,
 * com `horariosPorDia` horas contínuas (ex.: 10 = 08:00..17:00).
 * `dias`: quantidade de dias a partir de hoje (inclui hoje).
 */
export function gerarSlots(
  dias: number,
  horariosPorDia: number,
  startHour = 8,
): Date[] {
  const slots: Date[] = [];
  const agora = new Date();

  for (let i = 0; i < dias; i++) {
    const dia = new Date(agora);
    dia.setDate(agora.getDate() + i);

    if (dia.getDay() === 0 || dia.getDay() === 6) continue;

    for (let j = 0; j < horariosPorDia; j++) {
      const slot = new Date(dia);
      slot.setHours(startHour + j, 0, 0, 0);
      slots.push(slot);
    }
  }

  return slots;
}

/** ========= Montagem de calendário disponível =========
 * Remove slots ocupados (consultas de 1h) e agrupa por dia.
 * bookedStarts: datas/horários de INÍCIO de consultas já marcadas.
 */

function splitKey(key: string) {
  const [ymd, hh] = key.split(' ');
  return { dia: ymd, hora: `${hh}:00` };
}

export function montarCalendarioDisponivel(
  bookedStarts: (Date | string)[],
  dias = 30,
  horariosPorDia = 5, // 5 horários: 08–12
  startHour = 8,
  timeZone = DEFAULT_TZ,
): Record<string, string[]> {
  // 1) gera todos os slots possíveis
  const slots = gerarSlots(dias, horariosPorDia, startHour);

  // 2) gera chaves TZ
  const slotKeys = slots.map((s) => toKeyTZ(s, timeZone));
  const bookedKeys = (bookedStarts ?? [])
    .filter(Boolean)
    .map((b) => toKeyTZ(b as any, timeZone));

  // 3) filtra disponíveis
  const availableKeys = slotKeys.filter((k) => !bookedKeys.includes(k));

  // 4) monta calendário agrupado
  const calendario: Record<string, string[]> = {};
  for (const key of availableKeys) {
    const { dia, hora } = splitKey(key);
    if (!calendario[dia]) calendario[dia] = [];
    calendario[dia].push(hora);
  }

  // ordena horas dentro de cada dia
  for (const d of Object.keys(calendario)) calendario[d].sort();

  return calendario;
}

export const getHorariosMedicoDeclaration: GenAIFunctionDeclaration = {
  name: 'getHorariosMedico',
  description:
    'Obtém os horários disponíveis de um médico específico pelo nome ou CRM.',
  parameters: {
    type: 'OBJECT',
    properties: {
      termo: {
        type: 'STRING',
        description:
          'Nome ou CRM do médico para listar os horários disponíveis.',
      },
    },
    required: ['termo'],
  },
};

export const horarioMedicoTool: GenAITool = {
  functionDeclarations: [getHorariosMedicoDeclaration],
};

export function montarCalendarioDisponivelPorConsultas(
  bookedStarts: (Date | string)[],
  dias = 30,
  horariosPorDia = 5, // 5 horários por dia (08,09,10,11,12)
  startHour = 8, // começa às 08:00
  timeZone = DEFAULT_TZ,
): Record<string, string[]> {
  // 1) gera todos os slots dos próximos `dias` dias úteis
  const slots: Date[] = [];
  const agora = new Date();

  for (let i = 0; i < dias; i++) {
    const dia = new Date(agora);
    dia.setDate(agora.getDate() + i);

    // pula fim de semana
    if (dia.getDay() === 0 || dia.getDay() === 6) continue;

    for (let j = 0; j < horariosPorDia; j++) {
      const slot = new Date(dia);
      slot.setHours(startHour + j, 0, 0, 0);
      slots.push(slot);
    }
  }

  // 2) converte para chaves TZ
  const slotKeys = slots.map((s) => toKeyTZ(s, timeZone));
  const bookedKeys = (bookedStarts ?? [])
    .filter(Boolean)
    .map((b) => toKeyTZ(b as any, timeZone));

  // 3) filtra slots disponíveis
  const availableKeys = slotKeys.filter((k) => !bookedKeys.includes(k));

  // 4) monta calendário agrupado { YYYY-MM-DD: ["HH:mm", ...] }
  const calendario: Record<string, string[]> = {};
  for (const key of availableKeys) {
    const [ymd, hh] = key.split(' ');
    const hm = `${hh}:00`;
    if (!calendario[ymd]) calendario[ymd] = [];
    calendario[ymd].push(hm);
  }

  for (const k of Object.keys(calendario)) calendario[k].sort();

  return calendario;
}

export const marcarConsultaDeclaration: GenAIFunctionDeclaration = {
  name: 'marcarConsulta',
  description:
    'Agenda uma consulta para um paciente com um médico em um horário disponível.',
  parameters: {
    type: 'OBJECT',
    properties: {
      crm: {
        type: 'STRING',
        description: 'CRM do médico.',
      },
      dataHoraInicio: {
        type: 'STRING',
        description:
          'Data/hora no formato ISO 8601 para o início da consulta (ex.: 2025-09-28T10:00:00-03:00).',
      },
    },
    required: ['crm', 'dataHoraInicio'],
  },
};

export const consultaTool: GenAITool = {
  functionDeclarations: [marcarConsultaDeclaration],
};
