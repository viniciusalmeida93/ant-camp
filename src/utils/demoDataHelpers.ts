const FIRST_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Eduarda',
  'Felipe',
  'Gustavo',
  'Helena',
  'Igor',
  'Juliana',
  'Kaique',
  'Larissa',
  'Marcos',
  'Natália',
  'Otávio',
  'Patrícia',
  'Rafael',
  'Sabrina',
  'Thiago',
  'Vanessa',
];

const LAST_NAMES = [
  'Silva',
  'Souza',
  'Oliveira',
  'Costa',
  'Pereira',
  'Almeida',
  'Ferreira',
  'Gonçalves',
  'Rodrigues',
  'Martins',
  'Barbosa',
  'Araujo',
  'Melo',
  'Ribeiro',
  'Carvalho',
  'Teixeira',
  'Lima',
  'Moreira',
  'Cardoso',
  'Correia',
];

export const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG'] as const;

export const sanitizeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

export const createEmail = (prefix: string, index: number, memberIndex?: number) => {
  const memberSuffix = typeof memberIndex === 'number' ? `m${memberIndex}` : '';
  return `${prefix}${index}${memberSuffix}@demo.com`.toLowerCase().replace(/\s+/g, '');
};

export const generateFullName = (baseIndex: number, memberOffset = 0) => {
  const firstName = FIRST_NAMES[(baseIndex + memberOffset) % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(baseIndex * 2 + memberOffset) % LAST_NAMES.length];
  return `${firstName} ${lastName}`;
};

export const generateWhatsapp = (baseIndex: number, memberOffset = 0) => {
  const sequential = 10000000 + baseIndex * 17 + memberOffset;
  return `119${sequential.toString().padStart(8, '0')}`;
};

