
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
