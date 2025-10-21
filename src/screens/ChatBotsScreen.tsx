// screens/ChatBotsScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './ChatBotsScreen.styles';

// -------------------------
// Tipos de navegación
// -------------------------
type RootStackParamList = {
  Welcome: undefined;
  Todo: undefined;
  Daily: undefined;
  General: undefined;
  Preventive: undefined;
  Emergency: undefined;
  Profile: undefined;
  Route: undefined;
  Agenda: undefined;
  ChatBotsScreen: undefined;
  IAScreen: undefined;
};

type ChatBotsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatBotsScreen'
>;

// -------------------------
// Tipos de Mensajes
// -------------------------
type MessageType = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

// -------------------------
// Estado compartido de pantallas
// -------------------------
type DocumentsExpiryType = {
  soat?: string;
  tecnico?: string;
  picoPlacaDay?: string;
};

type PreventiveTask = {
  id: string;
  description: string;
  dueDate: string;          // ISO o "DD/MM/YYYY"
  completed: boolean;
  completedAt?: string;     // ISO
};

type ScreenState = {
  Daily?: {
    appointments?: Array<{ title: string; description?: string; date: string | Date; completed?: boolean }>;
    total?: number;
    nextAppointment?: any;
  };
  Agenda?: {
    appointments?: Array<{ title: string; description?: string; date: string | Date; completed?: boolean }>;
    total?: number;
    today?: number;
    upcoming?: number;
  };
  General?: {
    services?: string[];
    lastService?: string | null;
  };
  Preventive?: {
    tasks?: PreventiveTask[];
    totalTasks?: number;
    completed?: number;
    nextDue?: any;
  };
  Emergency?: {
    contacts?: string[];
    emergencyProtocol?: string;
    lastEntryAt?: string | null;
    entriesCount?: number;
  };
  Profile?: {
    name?: string;
    documents?: string[];
    documentsStatus?: string;
    documentsExpiry?: DocumentsExpiryType;
  };
  Route?: {
    routes?: string[];
    favorite?: string;
    totalDistance?: string;
  };
};

// -------------------------
// Utilidades de fechas (ES)
// -------------------------
const ES_MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
];
const ES_DAYS = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
];
const formatDateEs = (d: Date) =>
  `${d.getDate()} de ${ES_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const toDate = (x: string | Date | undefined): Date | null => {
  if (!x) return null;
  if (x instanceof Date) return x;
  const d = new Date(x);
  if (!isNaN(d.getTime())) return d;
  const m = String(x).match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    const yyyy = parseInt(m[3], 10);
    const d2 = new Date(yyyy, mm, dd);
    return isNaN(d2.getTime()) ? null : d2;
  }
  return null;
};

function parseDateFromText(text: string): Date | null {
  const t = text.toLowerCase().trim();

  if (/\bhoy\b/.test(t)) return new Date();
  if (/\bmañana\b/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 1); return d; }
  if (/\bpasado\s+mañana\b/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 2); return d; }

  for (let i = 0; i < ES_DAYS.length; i++) {
    const day = ES_DAYS[i];
    if (t.includes(day)) {
      const today = new Date().getDay();
      const diff = (i - today + 7) % 7;
      const d = new Date();
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  const m1 = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m1) {
    const dd = parseInt(m1[1], 10);
    const mm = parseInt(m1[2], 10) - 1;
    const yyyy = parseInt(m1[3], 10);
    const d = new Date(yyyy, mm, dd);
    if (!isNaN(d.getTime())) return d;
  }

  const m2 = t.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (m2) {
    const yyyy = parseInt(m2[1], 10);
    const mm = parseInt(m2[2], 10) - 1;
    const dd = parseInt(m2[3], 10);
    const d = new Date(yyyy, mm, dd);
    if (!isNaN(d.getTime())) return d;
  }

  const monthRegex = ES_MONTHS.join('|');
  const m3 = t.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${monthRegex})(?:\\s+de\\s+(\\d{4}))?\\b`, 'i'));
  if (m3) {
    const dd = parseInt(m3[1], 10);
    const monthName = m3[2].toLowerCase();
    const yyyy = m3[3] ? parseInt(m3[3], 10) : new Date().getFullYear();
    const mm = ES_MONTHS.indexOf(monthName);
    if (mm >= 0) {
      const d = new Date(yyyy, mm, dd);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function getDateRange(label: 'today'|'tomorrow'|'this-week'|'this-month'|'next-month') {
  const start = new Date(); start.setHours(0,0,0,0);
  let end = new Date(start);

  if (label === 'today') {
    end.setDate(start.getDate() + 1);
    return { start, end, label };
  }
  if (label === 'tomorrow') {
    start.setDate(start.getDate() + 1);
    end = new Date(start); end.setDate(start.getDate() + 1);
    return { start, end, label };
  }
  if (label === 'this-week') {
    const day = start.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    start.setDate(start.getDate() + diffToMonday);
    end = new Date(start); end.setDate(start.getDate() + 7);
    return { start, end, label };
  }
  if (label === 'this-month') {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end, label };
  }
  const firstNext = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const firstAfter = new Date(start.getFullYear(), start.getMonth() + 2, 1);
  return { start: firstNext, end: firstAfter, label };
}

// -------------------------
// Sanitización para voz
// -------------------------
function stripForSpeech(s: string): string {
  if (!s) return '';
  let cleanText = s.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu,
    ''
  );
  cleanText = cleanText
    .replace(/[•◆►▪︎▪■□–—\-*_#`~]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  cleanText = cleanText.replace(/\[.*?\]/g, '');
  cleanText = cleanText.replace(/https?:\/\/\S+/g, '');
  cleanText = cleanText.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.,!?;:()'-]/g, ' ');
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  return cleanText;
}

// -------------------------
// 🔐 Motor de Intenciones
// -------------------------
type DetectedIntent =
  | { screen: 'Preventive'; intent: 'LAST_DONE' }
  | { screen: 'Preventive'; intent: 'NEXT_DUE' }
  | { screen: 'Preventive'; intent: 'OVERDUE' }
  | { screen: 'Preventive'; intent: 'LIST_BY_DATE'; date: Date }
  | { screen: 'Preventive'; intent: 'SUMMARY' }
  | { screen: 'Profile';    intent: 'SOAT_DUE' | 'TEC_DUE' | 'DOCS_STATUS' | 'PICO_PLACA' }
  | { screen: 'Agenda' | 'Daily'; intent: 'LIST_BY_DATE'; date: Date }
  | { screen: 'Agenda' | 'Daily'; intent: 'LIST_RANGE'; start: Date; end: Date; label?: string }
  | { screen: 'Agenda' | 'Daily'; intent: 'SUMMARY' }
  | { screen: 'Preventive' | 'General' | 'Emergency' | 'Route'; intent: 'HISTORY_LAST5' };

type ProfileIntent = Extract<DetectedIntent, { screen: 'Profile' }>;
type PreventiveIntent = Extract<DetectedIntent, { screen: 'Preventive' }>;
type AgendaDailyIntent = Extract<DetectedIntent, { screen: 'Agenda' | 'Daily' }>;
type HistoryIntent = Extract<DetectedIntent, { intent: 'HISTORY_LAST5' }>;

function detectIntent(textRaw: string): DetectedIntent | null {
  const t = textRaw.toLowerCase();

  // Preventive
  if (/preventiv/.test(t)) {
    if (/(últim[oa]s?\s*\d*\s*registros?)|(lo\s+último\s+que\s+registr[ée]?)/.test(t)) {
      return { screen: 'Preventive', intent: 'HISTORY_LAST5' };
    }
    if (/últim|ultimo|último/.test(t) && /manten|servici/.test(t)) {
      return { screen: 'Preventive', intent: 'LAST_DONE' };
    }
    if (/próxim|proxim|siguient|vence|por vencer/.test(t)) {
      return { screen: 'Preventive', intent: 'NEXT_DUE' };
    }
    if (/vencid|atrasad/.test(t)) {
      return { screen: 'Preventive', intent: 'OVERDUE' };
    }
    const d = parseDateFromText(t);
    if (d) return { screen: 'Preventive', intent: 'LIST_BY_DATE', date: d };
    return { screen: 'Preventive', intent: 'SUMMARY' };
  }

  // General
  if (/general/.test(t)) {
    if (/(últim[oa]s?\s*\d*\s*registros?)|(lo\s+último\s+que\s+registr[ée]?)/.test(t)) {
      return { screen: 'General', intent: 'HISTORY_LAST5' };
    }
  }

  // Emergencia
  if (/emergenc/.test(t)) {
    if (/(últim[oa]s?\s*\d*\s*registros?)|(lo\s+último\s+que\s+registr[ée]?)/.test(t)) {
      return { screen: 'Emergency', intent: 'HISTORY_LAST5' };
    }
  }

  // Ruta(s)
  if (/\brutas?\b/.test(t)) {
    if (/(últim[oa]s?\s*\d*\s*registros?)|(lo\s+último\s+que\s+registr[ée]?)/.test(t)) {
      return { screen: 'Route', intent: 'HISTORY_LAST5' };
    }
  }

  // Profile
  if (/soat/.test(t)) return { screen: 'Profile', intent: 'SOAT_DUE' };
  if (/t[eé]cnic|tecnomec/.test(t)) return { screen: 'Profile', intent: 'TEC_DUE' };
  if (/pico\s*y\s*placa|picoyplaca/.test(t)) return { screen: 'Profile', intent: 'PICO_PLACA' };
  if (/document|estado de mis documento/.test(t)) return { screen: 'Profile', intent: 'DOCS_STATUS' };

  // Agenda / Daily
  const agendaRegex = /(agenda|calendari|daily)/;
  if (agendaRegex.test(t)) {
    if (/hoy/.test(t)) {
      const { start, end } = getDateRange('today');
      return { screen: t.includes('daily') ? 'Daily' : 'Agenda', intent: 'LIST_RANGE', start, end, label: 'hoy' };
    }
    if (/mañana/.test(t)) {
      const { start, end } = getDateRange('tomorrow');
      return { screen: t.includes('daily') ? 'Daily' : 'Agenda', intent: 'LIST_RANGE', start, end, label: 'mañana' };
    }
    if (/esta\s+semana/.test(t)) {
      const { start, end } = getDateRange('this-week');
      return { screen: t.includes('daily') ? 'Daily' : 'Agenda', intent: 'LIST_RANGE', start, end, label: 'esta semana' };
    }
    if (/este\s+mes/.test(t)) {
      const { start, end } = getDateRange('this-month');
      return { screen: t.includes('daily') ? 'Daily' : 'Agenda', intent: 'LIST_RANGE', start, end, label: 'este mes' };
    }
    if (/pr(ó|o)ximo\s+mes/.test(t)) {
      const { start, end } = getDateRange('next-month');
      return { screen: t.includes('daily') ? 'Daily' : 'Agenda', intent: 'LIST_RANGE', start, end, label: 'próximo mes' };
    }
    const d = parseDateFromText(t);
    if (d) return { screen: t.includes('daily') ? 'Daily' : 'Agenda', intent: 'LIST_BY_DATE', date: d };
    return { screen: 'Agenda', intent: 'SUMMARY' };
  }

  return null;
}

// -------------------------
// Q&A Informativas - MOTOS BAJO Y MEDIO CILINDRAJE (60+ PREGUNTAS)
// -------------------------
type InformativeQA = { question: string; answer: string };
type InformativeCategory = { title: string; qas: InformativeQA[] };

const INFORMATIVE_QA: InformativeCategory[] = [
  {
    title: 'Mantenimiento Básico Motos',
    qas: [
      {
        question: '¿Cada cuánto debo cambiar el aceite de mi moto?',
        answer: 'Para motos de bajo cilindraje (hasta 250cc): cada 2.000-3.000 km o 3-4 meses. Para medio cilindraje (250-500cc): cada 3.000-4.000 km o 4-6 meses. Siempre consulta el manual del fabricante.'
      },
      {
        question: '¿Qué tipo de aceite debo usar en mi moto?',
        answer: 'Usa aceites específicos para motos con clasificación JASO MA/MA2. Para bajo cilindraje: viscosidad 10W-40. Para medio cilindraje: 15W-50. Evita aceites para autos ya que pueden dañar el embrague.'
      },
      {
        question: '¿Cada cuánto debo limpiar y lubricar la cadena?',
        answer: 'Cada 500 km o después de circular bajo lluvia. Usa lubricante específico para cadenas y limpia con kerosene o desengrasante. Ajusta la holgura según manual (generalmente 2-3 cm).'
      },
      {
        question: '¿Cómo mantener la batería de mi moto?',
        answer: 'Revisa terminales limpios y apretados. Para baterías convencionales, verifica nivel de agua destilada mensualmente. Si no usas la moto por más de 15 días, desconecta la batería o usa un mantenedor.'
      },
      {
        question: '¿Cada cuánto debo revisar los frenos?',
        answer: 'Revisa pastillas cada 5.000 km. Líquido de frenos: cambio cada 2 años o 20.000 km. Si el tacto del freno es esponjoso, purga el sistema inmediatamente.'
      },
      {
        question: '¿Cuál es el mantenimiento básico mensual?',
        answer: 'Revisa: presión de llantas (28-30 PSI delantera, 32-34 trasera), nivel de aceite (en frío), tensión de cadena (2-3 cm), frenos, luces y espejos. Lubrica cables semanalmente.'
      }
    ]
  },
  {
    title: 'Neumáticos y Suspensión',
    qas: [
      {
        question: '¿Qué presión de llantas debo usar?',
        answer: 'Presión típica: delantera 28-30 PSI, trasera 32-34 PSI. Revisa en frío y ajusta según carga y tipo de conducción. Nunca excedas la presión máxima marcada en el flanco del neumático.'
      },
      {
        question: '¿Cuándo debo cambiar los neumáticos?',
        answer: 'Cuando la profundidad del dibujo sea menor a 1.6 mm (marca TWI) o aparezcan grietas, deformaciones o desgaste irregular. Vida útil promedio: 15.000-20.000 km trasero, 20.000-25.000 km delantero.'
      },
      {
        question: '¿Cómo saber si la suspensión necesita mantenimiento?',
        answer: 'Señales: fugas de aceite en horquilla, rebotes excesivos, ruidos al pasar baches, manejo inestable en curvas. Revisión cada 10.000 km o ante cualquier anomalía.'
      },
      {
        question: '¿Qué significa el desgaste irregular en las llantas?',
        answer: 'Desgaste en centro: exceso de presión. Desgaste en bordes: baja presión. Desgaste en un lado: problemas de alineación o suspensión. Escalones: suspensión desgastada o mala técnica de frenado.'
      },
      {
        question: '¿Cómo ajustar la suspensión para mi peso?',
        answer: 'Precarga del resorte: ajusta según manual (generalmente 25-30% de hundimiento con tu equipo). Amortiguación: más suave para ciudad, más dura para carretera. Registra ajustes iniciales.'
      }
    ]
  },
  {
    title: 'Motor y Transmisión',
    qas: [
      {
        question: '¿Por qué mi moto pierde potencia?',
        answer: 'Causas comunes: bujías desgastadas, filtro de aire sucio, carburador/inyectores obstruidos, baja compresión, escape tapado o problema en el sistema de encendido. Revisión progresiva desde lo más simple.'
      },
      {
        question: '¿Cada cuánto cambiar bujías?',
        answer: 'Bujías convencionales: 8.000-12.000 km. Bujías de iridio: 20.000-30.000 km. Síntomas de desgaste: arranque difícil, consumos elevados, fallos en ralentí y pérdida de potencia.'
      },
      {
        question: '¿Cómo mejorar el consumo de combustible?',
        answer: 'Mantén presión correcta de llantas, evita aceleraciones bruscas, usa marchas adecuadas (no circules a bajas revoluciones), manten filtro de aire limpio y revisa alineación y rodamientos.'
      },
      {
        question: '¿Qué hacer si la moto se calienta mucho?',
        answer: 'Verifica nivel de refrigerante (si es líquida), limpieza de radiador, funcionamiento del electroventilador, aceite del motor y que no haya obstrucciones en entradas de aire. No circules a bajas revoluciones prolongadamente.'
      },
      {
        question: '¿Cómo cuidar el embrague de mi moto?',
        answer: 'No descanses la mano en la palanca, cambia de marcha suavemente, no patines el embrague en pendientes y ajusta holgura de cable cada 3.000 km (1-2 cm de juego en la maneta).'
      },
      {
        question: '¿Por qué salta la cadena o hace ruido?',
        answer: 'Cadena estirada, piñones desgastados (dientes en "V"), desalineación de rueda trasera o rodamientos dañados. Revisa alineación con regla y cambia cadena y piñones juntos.'
      }
    ]
  },
  {
    title: 'Electricidad y Sistema de Encendido',
    qas: [
      {
        question: '¿Por qué se apaga mi moto en ralentí?',
        answer: 'Causas: bujía en mal estado, filtro de aire obstruido, mezcla incorrecta en carburador, válvula de ralentí sucia (inyección), sensor TPS descalibrado o baja compresión.'
      },
      {
        question: '¿Cómo diagnosticar problemas eléctricos?',
        answer: 'Verifica fusibles primero, luego batería (debe tener 12.5-13V), conexiones limpias y apretadas, y tierra de motor a chasis. Usa multímetro para medir carga de alternador (13.5-14.5V en ralentí).'
      },
      {
        question: '¿Las luces LED consumen menos batería?',
        answer: 'Sí, consumen 60-80% menos que halógenas y duran más. Al instalarlas, verifica compatibilidad con sistema de carga y considera instalar balastos o resistencias para evitar parpadeos.'
      },
      {
        question: '¿Por qué no enciende la moto?',
        answer: 'Verifica en orden: batería (12V mínimo), fusibles, interruptor de corte, relé de arranque, motor de arranque y compresión. Si hace clic pero no arranca: batería descargada o conexiones sueltas.'
      },
      {
        question: '¿Por qué se descarga la batería frecuentemente?',
        answer: 'Causas: regulador dañado (sobrecarga o subcarga), consumo parásito (instalaciones mal hechas), batería vieja, conexiones oxidadas. Mide: 13.5-14.5V en ralentí, >12.5V apagada.'
      }
    ]
  },
  {
    title: 'Seguridad y Conducción',
    qas: [
      {
        question: '¿Qué elementos de seguridad debo revisar siempre?',
        answer: 'Checklist diario: luces (alta, baja, stop, direccionales), presión de llantas, frenos delantero y trasero, nivel de aceite, espejos ajustados y cadena con tensión correcta.'
      },
      {
        question: '¿Cómo frenar correctamente en emergencia?',
        answer: 'Aplica 70% de fuerza en freno delantero y 30% en trasero, mantén el cuerpo recto, no cierres completamente el acelerador y mira hacia donde quieres ir, no al obstáculo. Practica en lugar seguro.'
      },
      {
        question: '¿Qué llevar en el kit de herramientas básico?',
        answer: 'Llaves de cruz, destornilladores plano y cruz, llaves allen, pinzas, tronchacables, cinta aislante, parches para llantas, inflador portátil, fusibles de repuesto y linterna.'
      },
      {
        question: '¿Cómo preparar la moto para un viaje largo?',
        answer: 'Revisa: neumáticos (presión y desgaste), frenos (pastillas y líquido), cadena (tensión y lubricación), niveles (aceite, refrigerante), luces, carga de batería y lleva herramientas básicas.'
      },
      {
        question: '¿Cómo evitar que me roben la moto?',
        answer: 'Candado disco freno U-Lock, alarma con sensor de movimiento, GPS oculto, estacionar en lugares iluminados, traba de dirección siempre y cadena a objeto fijo. Seguro contra robo recomendado.'
      },
      {
        question: '¿Qué hacer en una curva tomada muy rápido?',
        answer: 'No frenes bruscamente, inclina más el cuerpo y la moto, mira hacia la salida, mantén aceleración constante y usa todo el carril. Practica técnicas de contra-maneo en circuito.'
      }
    ]
  },
  {
    title: 'Problemas Comunes y Soluciones',
    qas: [
      {
        question: '¿Por qué vibra mucho el manubrio?',
        answer: 'Causas: llantas desbalanceadas, rodamientos de dirección desgastados, horquilla dañada, ruedas desalineadas o soportes del motor flojos. Revisa progresivamente desde el balanceo de ruedas.'
      },
      {
        question: '¿Qué hacer si se pincha una llanta?',
        answer: 'No frenes bruscamente, sujeta firmemente el manubrio, reduce velocidad gradualmente y busca lugar seguro para detenerte. Usa kit de parches o llama grúa. No circules con llanta desinflada.'
      },
      {
        question: '¿Por qué hace ruido la cadena?',
        answer: 'Cadena seca o sucia, exceso de tensión, piñones desgastados, desalineación de rueda trasera o rodamientos de rueda en mal estado. Lubrica y ajusta según manual.'
      },
      {
        question: '¿Cómo eliminar el golpeteo en el motor?',
        answer: 'Golpeteo metálico puede ser: taqués hidráulicos (ajuste cada 10.000 km), cadena de distribución tensa, bielas o pistón desgastados. Diagnóstico profesional recomendado.'
      },
      {
        question: '¿Por qué huele a gasolina?',
        answer: 'Fugas en mangueras, conexiones flojas en carburador/inyectores, tapa de tanque mal sellada o flotador del carburador atascado. Revisa inmediatamente por riesgo de incendio.'
      },
      {
        question: '¿Humo blanco, azul o negro del escape?',
        answer: 'Blanco (en frío): normal condensación. Blanco (caliente): junta de culata. Azul: quema aceite (anillos o guías). Negro: mezcla rica (carburador/inyección). Revisa consumo de aceite.'
      }
    ]
  },
  {
    title: 'Documentación y Legal',
    qas: [
      {
        question: '¿Qué documentos debo llevar siempre en la moto?',
        answer: 'Licencia de conducción categoría A1/A2, SOAT vigente, tarjeta de propiedad o matrícula, revisión técnico-mecánica y documento de identidad. Multas por no portarlos pueden ser costosas.'
      },
      {
        question: '¿Cada cuánto debo hacer la revisión técnico-mecánica?',
        answer: 'Primera revisión: 2 años después de matrícula. Luego: cada año para servicio público, cada 2 años para particular. Verifica fechas exactas en tu licencia de tránsito.'
      },
      {
        question: '¿Qué cubre el SOAT para motos?',
        answer: 'Cubre gastos médicos hasta 800 SMLV por persona en accidentes de tránsito, incapacidad permanente o muerte. No cubre daños a la moto, terceros ni robos. Es obligatorio para circular.'
      },
      {
        question: '¿Qué modificaciones son legales en mi moto?',
        answer: 'Permitidas: espejos adicionales, baúles, defensas, luces auxiliares. Prohibidas: escape ruidoso, modificaciones al motor que aumenten potencia, cambios de color sin notificar, eliminación de retrovisores.'
      }
    ]
  },
  {
    title: 'Consejos para Nuevos Motociclistas',
    qas: [
      {
        question: '¿Qué moto elegir para principiantes?',
        answer: 'Recomendado: 125-300cc, peso liviano, posición erguida, frenos ABS y mantenimiento económico. Marcas como Honda, Yamaha, Bajaj y Suzuki tienen buenas opciones de entrada.'
      },
      {
        question: '¿Cómo dominar las curvas con seguridad?',
        answer: 'Frena antes de la curva, mira hacia la salida, inclina cuerpo y moto simultáneamente, mantén velocidad constante y acelera suavemente al salir. Practica en vías seguras.'
      },
      {
        question: '¿Qué equipo de protección es esencial?',
        answer: 'Casco certificado ECE o DOT, guantes con protección, chaqueta con protecciones, pantalón resistente y botas que cubran tobillos. La ropa de protección salva vidas en caídas.'
      },
      {
        question: '¿Cómo mejorar la visibilidad ante otros conductores?',
        answer: 'Usa chaleco reflectivo, mantén luces encendidas siempre, posiciónate en carril donde seas visible, haz señales claras y evita puntos ciegos de otros vehículos.'
      },
      {
        question: '¿Qué hacer en caso de lluvia?',
        answer: 'Reduce velocidad, aumenta distancia de frenado, evita pintura vial y rejillas, usa trajes impermeables y revisa que las luces funcionen correctamente. Seca frenos después de cruzar charcos.'
      }
    ]
  },
  {
    title: 'Reparaciones en Casa',
    qas: [
      {
        question: '¿Cómo cambiar el aceite yo mismo?',
        answer: 'Calienta motor 5 min, coloca sobre caballete, quita tapa de llenado, desagota por tornillo, cambia filtro (lubrica junta), cierra todo, llena con cantidad exacta, arranca y revisa nivel en frío.'
      },
      {
        question: '¿Cómo ajustar y lubricar la cadena?',
        answer: 'Limpia con kerosene y cepillo, seca bien, ajusta tensión (2-3 cm holgura), verifica alineación (marcas en swingarm), aplica lubricante en eslabones internos, gira rueda y elimina exceso.'
      },
      {
        question: '¿Cómo cambiar pastillas de freno?',
        answer: 'Quita pernos de caliper, retira pastillas viejas, empuja pistones con destornillador (con reservorio abierto), limpia guías, instala pastillas nuevas, monta caliper y bombea freno antes de rodar.'
      },
      {
        question: '¿Cómo limpiar el carburador?',
        answer: 'Cierra llave de gasolina, desconecta mangueras, quita carburador, desarma con cuidado, limpia jets con aire comprimido, revisa flotador y aguja, reassambla y ajusta mezcla. Usa kit de reparación.'
      },
      {
        question: '¿Cómo diagnosticar y cambiar una bujía?',
        answer: 'Desconecta cable, limpia área, usa llave larga para bujías, saca y revisa color: café (bueno), negro (rica), blanco (pobre). Ajusta gap según manual, instala con torque correcto.'
      }
    ]
  },
  {
    title: 'Rendimiento y Puesta a Punto',
    qas: [
      {
        question: '¿Cómo aumentar la potencia legalmente?',
        answer: 'Filtro de aire de alto flujo, escape completo (homologado), reprogramación de ECU (si es inyección) y relación de transmisión más corta. Evita modificaciones que afecten emisiones. Ganancia: 5-15%.'
      },
      {
        question: '¿Por qué mi moto consume mucho combustible?',
        answer: 'Causas: filtro de aire sucio, bujías gastadas, presión baja de llantas, frenos arrastrando, carburador mal ajustado, conducción agresiva. Revisa chispa de bujías (color café).'
      },
      {
        question: '¿Qué relación de transmisión elegir para ciudad?',
        answer: 'Para ciudad: piñón trasero 2-4 dientes más grande o piñón delantero 1 diente menos. Mejora aceleración pero reduce velocidad máxima. Para carretera: relación más larga.'
      },
      {
        question: '¿Cómo mejorar la frenada?',
        answer: 'Pastillas sinterizadas, líquido de frenos DOT 4, línea de freno de acero (menos expansión), discos perforados y llantas de buena calidad. Técnica: usa 70% freno delantero, 30% trasero.'
      },
      {
        question: '¿Cómo detectar problemas graves en el motor temprano?',
        answer: 'Señales: humo azul (quema aceite), golpeteo metálico en aceleración (bielas), pérdida excesiva de aceite, sobrecalentamiento constante. Revisión inmediata recomendada.'
      }
    ]
  },
  {
    title: 'Viajes Largos y Equipaje',
    qas: [
      {
        question: '¿Qué revisar antes de un viaje de más de 500 km?',
        answer: 'Checklist completo: neumáticos (presión y desgaste), frenos (pastillas y líquido), cadena (tensión y lubricación), niveles (aceite, refrigerante), luces, carga eléctrica, suspensión y documentación.'
      },
      {
        question: '¿Cómo cargar equipaje correctamente?',
        answer: 'Peso bajo y cerca del centro, máximo 30% del peso de la moto, asegura con correas de calidad, equilibra lados, revisa anclajes frecuentemente y evita bloques altos que afecten aerodinámica.'
      },
      {
        question: '¿Qué llevar en el kit de viaje?',
        answer: 'Kit básico de herramientas, parches para llantas, inflador, fusibles de repuesto, linterna, botiquín, documentos, agua, comida energética, cargador portátil y ropa de lluvia.'
      },
      {
        question: '¿Cómo evitar la fatiga en viajes largos?',
        answer: 'Paradas cada 2 horas o 150 km, hidratación constante, postura relajada, estiramientos en paradas, música relajante, protección auditiva y planifica ruta con anticipación.'
      },
      {
        question: '¿Cómo almacenar mi moto por más de 15 días?',
        answer: 'Llena el tanque, agrega estabilizador de gasolina, desconecta batería, infla llantas 5 PSI extra, limpia y lubrica cadena, coloca sobre caballete central y cubre con lona transpirable.'
      }
    ]
  }
];

// Normalizador/ayudantes
function normalizeTxt(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Limpia QAs vacías y elimina duplicados por texto normalizado
function cleanInformativeCatalog(cats: InformativeCategory[]): InformativeCategory[] {
  const seen = new Set<string>();
  return cats
    .map(cat => {
      const qas = cat.qas
        .filter(qa => qa.question && qa.answer)
        .filter(qa => {
          const key = normalizeTxt(qa.question);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      return { ...cat, qas };
    })
    .filter(cat => cat.qas.length > 0);
}

const INFORMATIVE_QA_CLEAN = cleanInformativeCatalog(INFORMATIVE_QA);

// -------------------------
// Helpers: historial / últimos 5 por pantalla
// -------------------------
const APP_HISTORY_KEY = '@app_history';
const PREVENTIVE_JOURNAL_KEY = '@journal_entries_Preventive';
const GENERAL_JOURNAL_KEY    = '@journal_entries_general';
const EMERGENCY_JOURNAL_KEY  = '@journal_entries_emergency';
const ROUTE_JOURNAL_KEY      = '@journal_entries_route';

type AppHistoryItem = { id: string; action: string; screen: string; data: any; timestamp: string };

async function loadHistory(): Promise<AppHistoryItem[]> {
  const raw = await AsyncStorage.getItem(APP_HISTORY_KEY);
  const arr: AppHistoryItem[] = raw ? JSON.parse(raw) : [];
  return arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

async function last5FromHistoryFor(screen: 'Emergency'|'Route'|'General'|'Preventive'): Promise<string[]> {
  const list = await loadHistory();
  const keyVariants = [screen, `${screen}Screen`].map(s => s.toLowerCase());
  const hits = list.filter(it => {
    const scr = (it.screen || '').toString().toLowerCase();
    return keyVariants.some(k => scr.includes(k));
  }).slice(0, 5);

  if (!hits.length) return [];
  return hits.map(it => {
    const when = new Date(it.timestamp);
    const details = it.data ? JSON.stringify(it.data) : '';
    return `${when.toLocaleDateString()} ${when.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} — ${it.action}${details ? ` — ${details}` : ''}`;
  });
}

// --- Preventive ---
type PreventiveJournalEntry = { id: string; text?: string; image?: string; date: string | Date };

async function last5PreventiveJournal(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PREVENTIVE_JOURNAL_KEY);
  if (!raw) return [];
  let entries: PreventiveJournalEntry[] = [];
  try { entries = JSON.parse(raw); } catch { return []; }
  const norm = entries
    .map(e => ({ ...e, date: new Date(e.date) }))
    .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime())
    .slice(0, 5);
  if (!norm.length) return [];
  return norm.map(e => {
    const d   = e.date as Date;
    const base = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const txt  = e.text ? ` — ${e.text}` : '';
    const img  = e.image ? ' — [imagen adjunta]' : '';
    return `${base}${txt}${img}`;
  });
}


// --- General ---
type GeneralJournalEntry = { id: string; text?: string; image?: string; date: string | Date };
async function last5GeneralJournal(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(GENERAL_JOURNAL_KEY);
  if (!raw) return [];
  let entries: GeneralJournalEntry[] = [];
  try { entries = JSON.parse(raw); } catch { return []; }
  const norm = entries
    .map(e => ({ ...e, date: new Date(e.date) }))
    .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime())
    .slice(0, 5);
  if (!norm.length) return [];
  return norm.map(e => {
    const d = e.date as Date;
    const base = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    const txt = e.text ? ` — ${e.text}` : '';
    const img = e.image ? ' — [imagen adjunta]' : '';
    return `${base}${txt}${img}`;
  });
}

// --- Emergency ---
type EmergencyJournalEntry = { id: string; text?: string; image?: string; date: string | Date };
async function last5EmergencyJournal(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(EMERGENCY_JOURNAL_KEY);
  if (!raw) return [];
  let entries: EmergencyJournalEntry[] = [];
  try { entries = JSON.parse(raw); } catch { return []; }
  const norm = entries
    .map(e => ({ ...e, date: new Date(e.date) }))
    .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime())
    .slice(0, 5);
  if (!norm.length) return [];
  return norm.map(e => {
    const d = e.date as Date;
    const base = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
    const txt = e.text ? ` — ${e.text}` : '';
    const img = e.image ? ' — [imagen adjunta]' : '';
    return `${base}${txt}${img}`;
  });
}

// --- Route (bitácora propia; si no existe, usa historial como fallback) ---
type RouteJournalEntry = { id: string; text?: string; image?: string; date: string | Date };
async function last5RouteJournalOrHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(ROUTE_JOURNAL_KEY);
  if (raw) {
    let entries: RouteJournalEntry[] = [];
    try { entries = JSON.parse(raw); } catch { /* ignore */ }
    const norm = (entries || [])
      .map(e => ({ ...e, date: new Date(e.date) }))
      .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime())
      .slice(0, 5);
    if (norm.length) {
      return norm.map(e => {
        const d = e.date as Date;
        const base = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
        const txt = e.text ? ` — ${e.text}` : '';
        const img = e.image ? ' — [imagen adjunta]' : '';
        return `${base}${txt}${img}`;
      });
    }
  }
  // Fallback a historial si aún no implementas bitácora en Rutas
  return await last5FromHistoryFor('Route');
}

// -------------------------
// Agente Inteligente
// -------------------------
class IntelligentAgent {
  private screenStates: ScreenState = {};
  private lastResponses: string[] = [];
  private informativeQAsFlat: InformativeQA[] = []; // 👉 se setea desde fuera
  private readonly MAX_HISTORY = 5;

  setInformativeCatalog(cats: InformativeCategory[]) {
    this.informativeQAsFlat = cats.flatMap(c => c.qas);
  }

  async refreshFromStorage() {
    try {
      const ss = await AsyncStorage.getItem('@screen_states');
      if (ss) this.screenStates = JSON.parse(ss);

      if (!this.screenStates.Profile?.documentsExpiry) {
        const td = await AsyncStorage.getItem('@tabData');
        if (td) {
          const { soat, tecnico, picoyplaca } = JSON.parse(td || '{}');

          const exp: DocumentsExpiryType = {};
          const parseLoose = (v?: string) => {
            if (!v) return undefined;
            const d = parseDateFromText(v);
            return d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString() : undefined;
          };
          exp.soat = parseLoose(soat);
          exp.tecnico = parseLoose(tecnico);
          exp.picoPlacaDay = picoyplaca || undefined;

          const prof = this.screenStates.Profile || { documents: [] };
          prof.documentsExpiry = { ...prof.documentsExpiry, ...exp };
          if (!prof.documents) prof.documents = ['SOAT', 'Técnico Mecánica'];
          this.screenStates.Profile = prof;
        }
      }
    } catch (error) {
      console.error('Error refreshing from storage:', error);
    }
  }

  private bullets(lines: string[]) {
    return lines.filter(Boolean).map(l => `• ${l}`).join('\n');
  }

  private addToResponseHistory(response: string) {
    this.lastResponses.push(response);
    if (this.lastResponses.length > this.MAX_HISTORY) this.lastResponses.shift();
  }

  // --------- Handlers por pantalla ----------
  private handlePreventive(intent: Extract<DetectedIntent, { screen: 'Preventive' }>): string {
    const st = this.screenStates.Preventive || {};
    const tasks = (st.tasks || []) as PreventiveTask[];

    if (!tasks.length) {
      if ('date' in (intent as any)) {
        const d = (intent as any).date as Date;
        return `No encuentro tareas preventivas para ${formatDateEs(d)}.`;
      }
      return 'Preventivo: no tengo tareas registradas aún.';
    }

    const parseTaskDate = (t: PreventiveTask) => toDate(t.completedAt || t.dueDate);

    if (intent.intent === 'LAST_DONE') {
      const done = tasks.filter(t => t.completed && parseTaskDate(t)).sort((a,b) => {
        const da = parseTaskDate(a)!.getTime();
        const db = parseTaskDate(b)!.getTime();
        return db - da;
      });
      if (!done.length) return 'Aún no veo mantenimientos preventivos completados.';
      const last = done[0];
      const when = parseTaskDate(last)!;
      return `Último mantenimiento preventivo: ${formatDateEs(when)} — ${last.description}.`;
    }

    if (intent.intent === 'NEXT_DUE') {
      const today = new Date();
      const pending = tasks
        .filter(t => !t.completed && toDate(t.dueDate))
        .sort((a,b) => (toDate(a.dueDate)!.getTime() - toDate(b.dueDate)!.getTime()));
      const next = pending.find(t => toDate(t.dueDate)!.getTime() >= today.getTime());
      if (!next) return 'No encuentro próximos mantenimientos preventivos programados.';
      const when = toDate(next.dueDate)!;
      return `Próximo mantenimiento preventivo: ${formatDateEs(when)} — ${next.description}.`;
    }

    if (intent.intent === 'OVERDUE') {
      const today = new Date();
      const overdue = tasks.filter(t => !t.completed && toDate(t.dueDate) && toDate(t.dueDate)!.getTime() < today.getTime());
      if (!overdue.length) return 'No tienes tareas preventivas vencidas. ✅';
      const lines = overdue
        .sort((a,b) => toDate(a.dueDate)!.getTime() - toDate(b.dueDate)!.getTime())
        .slice(0, 5)
        .map(t => `${t.description} — vencía ${formatDateEs(toDate(t.dueDate)!)}.`);
      return `Tareas preventivas vencidas (${overdue.length}):\n${this.bullets(lines)}`;
    }

    if (intent.intent === 'LIST_BY_DATE') {
      const d = (intent as any).date as Date;
      const hits = (st.tasks || []).filter((t: any) => {
        const due = toDate(t.dueDate);
        const done = t.completedAt ? toDate(t.completedAt) : null;
        return (due && sameDay(due, d)) || (done && sameDay(done, d));
      });
      if (!hits.length) return `Sin tareas preventivas para ${formatDateEs(d)}.`;
      const lines = hits.map((t: any) => {
        const tag = t.completed ? '✅' : '⏳';
        const ref = t.completed ? (toDate(t.completedAt!) || toDate(t.dueDate)!) : toDate(t.dueDate)!;
        const label = t.completed ? 'completada' : 'programada';
        return `${tag} ${t.description} — ${label} el ${formatDateEs(ref)}.`;
      });
      return `Preventivo — ${formatDateEs(d)}:\n${this.bullets(lines)}`;
    }

    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const today = new Date();
    const overdue = tasks.filter(t => !t.completed && toDate(t.dueDate) && toDate(t.dueDate)!.getTime() < today.getTime()).length;
    return `Preventivo: ${total} tareas, ${done} completadas, ${overdue} vencidas.`;
  }

  private handleProfile(intent: any): string {
    const st = this.screenStates.Profile || {};
    const exp = st.documentsExpiry || {};
    const fmt = (iso?: string) => (iso ? formatDateEs(new Date(iso)) : 'N/D');

    if (intent.intent === 'SOAT_DUE') {
      return exp.soat ? `SOAT vence: ${fmt(exp.soat)}.` : 'No tengo la fecha de vencimiento del SOAT.';
    }
    if (intent.intent === 'TEC_DUE') {
      return exp.tecnico ? `Técnico Mecánica vence: ${fmt(exp.tecnico)}.` : 'No tengo la fecha de vencimiento de la Técnico Mecánica.';
    }
    if (intent.intent === 'PICO_PLACA') {
      return `Pico y Placa: ${exp.picoPlacaDay || 'N/D'}.`;
    }
    const docs = st.documents || [];
    return `Perfil — Documentos: ${docs.length}. Estado: ${st.documentsStatus || 'N/D'}.`;
  }

  private handleAgendaDaily(screen: 'Agenda'|'Daily', intent: any): string {
    const st = this.screenStates[screen] || {};
    const apps = (st.appointments || []).map((a: any) => ({ ...a, date: toDate(a.date) })).filter(a => a.date);

    if (intent.intent === 'LIST_BY_DATE') {
      const d = (intent as any).date as Date;
      const same = apps.filter(a => sameDay(a.date as Date, d));
      if (!same.length) return `No encuentro eventos en ${screen} para ${formatDateEs(d)}.`;
      const lines = same
        .sort((a,b) => (a.date as Date).getTime() - (b.date as Date).getTime())
        .map(a => `${a.title}${a.description ? ` — ${a.description}` : ''}`);
      return `${screen} — ${formatDateEs(d)}:\n${this.bullets(lines)}`;
    }

    if (intent.intent === 'LIST_RANGE') {
      const { start, end } = intent as any;
      const hits = apps
        .filter(a => {
          const ts = (a.date as Date).getTime();
          return ts >= start.getTime() && ts < end.getTime();
        })
        .sort((a,b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      const label = (intent as any).label ? ` (${(intent as any).label})` : '';
      if (!hits.length) return `${screen}${label}: sin eventos.`;
      const lines = hits.slice(0, 20).map(a => `${a.title}${a.description ? ` — ${a.description}` : ''}`);
      return `${screen}${label}: ${hits.length} evento(s).\n${this.bullets(lines)}`;
    }

    const today = new Date();
    const total = apps.length;
    const todayCount = apps.filter(a => sameDay(a.date as Date, today)).length;
    const upcoming = apps.filter(a => (a.date as Date).getTime() > today.getTime()).length;
    return `${screen}: ${total} en total, ${todayCount} hoy, ${upcoming} próximas.`;
  }

  private async handleHistoryLast5(intent: HistoryIntent): Promise<string> {
    if (intent.intent !== 'HISTORY_LAST5') return 'No entendí el historial solicitado.';

    if (intent.screen === 'Preventive') {
      const lines = await last5PreventiveJournal();
      if (!lines.length) return 'Preventivo — No encuentro registros recientes.';
      return `Preventivo — Últimos ${Math.min(5, lines.length)} registros:\n${this.bullets(lines)}`;
    }

    if (intent.screen === 'General') {
      const lines = await last5GeneralJournal();
      if (!lines.length) return 'General — No encuentro registros recientes.';
      return `General — Últimos ${Math.min(5, lines.length)} registros:\n${this.bullets(lines)}`;
    }

    if (intent.screen === 'Emergency') {
      const lines = await last5EmergencyJournal();
      if (!lines.length) return 'Emergencia — No encuentro registros recientes.';
      return `Emergencia — Últimos ${Math.min(5, lines.length)} registros:\n${this.bullets(lines)}`;
    }

    if (intent.screen === 'Route') {
      const lines = await last5RouteJournalOrHistory();
      if (!lines.length) return 'Rutas — No encuentro registros recientes.';
      return `Rutas — Últimos ${Math.min(5, lines.length)} registros:\n${this.bullets(lines)}`;
    }

    return 'No pude resolver esa consulta.';
  }

  private analyze(screen: keyof ScreenState) {
    switch (screen) {
      case 'Daily':      return { details: this.handleAgendaDaily('Daily',  { screen: 'Daily',  intent: 'SUMMARY' } as any) };
      case 'Agenda':     return { details: this.handleAgendaDaily('Agenda', { screen: 'Agenda', intent: 'SUMMARY' } as any) };
      case 'General': {
        const st = this.screenStates.General || {};
        const services = st.services || [];
        return { details: `General: ${services.length} servicios. Último: ${st.lastService ? formatDateEs(new Date(st.lastService)) : 'N/D'}.` };
      }
      case 'Preventive': return { details: this.handlePreventive({ screen: 'Preventive', intent: 'SUMMARY' } as any) };
      case 'Emergency': {
        const st = this.screenStates.Emergency || {};
        const c = st.contacts || [];
        return { details: `Emergencia: ${c.length} contacto(s). ${st.entriesCount ? `Entradas: ${st.entriesCount}.` : ''}` };
      }
      case 'Profile':    return { details: this.handleProfile({ screen: 'Profile', intent: 'DOCS_STATUS' } as any) };
      case 'Route': {
        const st = this.screenStates.Route || {};
        const r = st.routes || [];
        return { details: `Rutas: ${r.length}. Favorita: ${st.favorite || 'N/D'}.` };
      }
      default: return { details: 'Pantalla no reconocida.' };
    }
  }

  private getContextSummary(): string {
    const keys: (keyof ScreenState)[] = ['Daily','Agenda','General','Preventive','Emergency','Profile','Route'];
    const lines: string[] = [];
    for (const k of keys) {
      const a = this.analyze(k);
      lines.push(`• ${k}: ${a.details}`);
    }
    return `Resumen de tu aplicación:\n${lines.join('\n')}`;
  }

  async answer(userMessage: string): Promise<string> {
    const text = userMessage.trim();
    const low = text.toLowerCase();

    // 0) Coincidencia exacta con Preguntas Informativas (en código)
    const norm = normalizeTxt(low);
    const hit = this.informativeQAsFlat.find(q => normalizeTxt(q.question) === norm);
    if (hit) {
      this.addToResponseHistory(hit.answer);
      return hit.answer;
    }

    const intent = detectIntent(low);

    if (intent) {
      await this.refreshFromStorage();

      if (intent.intent === 'HISTORY_LAST5') {
        const out = await this.handleHistoryLast5(intent as HistoryIntent);
        this.addToResponseHistory(out);
        return out;
      }
      if (intent.screen === 'Preventive') {
        const out = this.handlePreventive(intent as any);
        this.addToResponseHistory(out);
        return out;
      }
      if (intent.screen === 'Profile') {
        const out = this.handleProfile(intent as any);
        this.addToResponseHistory(out);
        return out;
      }
      if (intent.screen === 'Agenda' || intent.screen === 'Daily') {
        const out = this.handleAgendaDaily(intent.screen, intent as any);
        this.addToResponseHistory(out);
        return out;
      }
      const out = this.analyze(intent.screen as any).details;
      this.addToResponseHistory(out);
      return out;
    }

    // Búsqueda por keyword de pantalla → resumen
    const SCREEN_KEYWORDS: Record<string, keyof ScreenState> = {
      perfil: 'Profile',
      daily: 'Daily',
      agenda: 'Agenda',
      calendario: 'Agenda',
      general: 'General',
      preventivo: 'Preventive',
      preventiva: 'Preventive',
      emergencia: 'Emergency',
      ruta: 'Route',
      rutas: 'Route',
      profile: 'Profile',
      route: 'Route',
      emergency: 'Emergency',
      preventive: 'Preventive',
    };
    for (const [kw, screen] of Object.entries(SCREEN_KEYWORDS)) {
      if (low.includes(kw)) {
        await this.refreshFromStorage();
        const out = this.analyze(screen).details;
        this.addToResponseHistory(out);
        return out;
      }
    }

    if (/(^|\s)(hola|buenas|saludos)(\s|$)/i.test(low)) {
      const response = `¡Hola! 👋 Tengo Preguntas Frecuentes (Perfil/Agenda/Otras) y Preguntas Informativas (predefinidas en código). También puedo listar los últimos 5 registros de Preventivo, General, Emergencia y Rutas. \n\n${this.getContextSummary()}\n\n¿Sobre qué quieres saber más?`;
      this.addToResponseHistory(response);
      return response;
    }
    if (/ayuda|qué puedes|como me puedes ayudar/i.test(low)) {
      const response = `Puedo responder con lo que haya en cada pantalla (sin abrirla):
• Perfil: SOAT, Técnico, Pico y Placa
• Agenda/Daily: hoy, mañana, semana, mes, próximo mes o una fecha concreta
• Preventivo/General/Emergencia/Rutas: "últimos 5 registros"
• Además: Preguntas Informativas (motos bajo y medio cilindraje) predefinidas en el código.`;
      this.addToResponseHistory(response);
      return response;
    }
    if (/resumen|estado|cómo va|como va/i.test(low)) {
      const response = this.getContextSummary();
      this.addToResponseHistory(response);
      return response;
    }

    const response = `Entiendo: "${text}".\n\n${this.getContextSummary()}\n\nPrueba: "Agenda hoy", "¿Cuándo vence el SOAT?", "Últimos 5 registros en emergencia", o "Últimos 5 registros en rutas".`;
    this.addToResponseHistory(response);
    return response;
  }

  speak(text: string) {
    const sanitized = stripForSpeech(text);
    try {
      Speech.stop();
      Speech.speak(sanitized, { language: 'es-ES', pitch: 1.0, rate: 0.9 });
    } catch (error) {
      console.error('Error en speech:', error);
    }
  }
}

// -------------------------
// Componente de pantalla (UI)
// -------------------------
const ChatBotsScreen = () => {
  const navigation = useNavigation<ChatBotsScreenNavigationProp>();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [showFrequent, setShowFrequent] = useState(false);
  const [showInformative, setShowInformative] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const agentRef = useRef(new IntelligentAgent());

  useEffect(() => {
    (async () => {
      agentRef.current.setInformativeCatalog(INFORMATIVE_QA_CLEAN);
      await agentRef.current.refreshFromStorage();

      const welcome: MessageType = {
        id: Date.now().toString(),
        text: '¡Hola! 👋  Soy tu asistente inteligente. \n\n¿Cómo puedo ayudarte? ',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcome]);

      setTimeout(() => agentRef.current.speak('¡Hola! Soy tu asistente inteligente. ¿Cómo puedo ayudarte?'), 350);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      agentRef.current.refreshFromStorage();
      return () => {};
    }, [])
  );

  useEffect(() => {
    if (messages.length && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const sendMessage = async () => {
    const txt = inputText.trim();
    if (!txt) return;

    setShowFrequent(false);
    setShowInformative(false);
    setIsProcessing(true);

    const userMsg: MessageType = {
      id: Date.now().toString(),
      text: txt,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    const reply = await agentRef.current.answer(txt);

    const botMsg: MessageType = {
      id: (Date.now() + 1).toString(),
      text: reply,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMsg]);
    agentRef.current.speak(reply);
    setIsProcessing(false);
  };

  const selectQuick = async (q: string) => {
    setShowFrequent(false);
    setIsProcessing(true);

    const userMsg: MessageType = {
      id: Date.now().toString(),
      text: q,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    const reply = await agentRef.current.answer(q);

    const botMsg: MessageType = {
      id: (Date.now() + 1).toString(),
      text: reply,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMsg]);
    agentRef.current.speak(reply);
    setIsProcessing(false);
  };

  const selectInformative = (qa: { question: string; answer: string }) => {
    setShowInformative(false);
    const userMsg: MessageType = {
      id: Date.now().toString(),
      text: qa.question,
      sender: 'user',
      timestamp: new Date(),
    };
    const botMsg: MessageType = {
      id: (Date.now() + 1).toString(),
      text: qa.answer,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
    agentRef.current.speak(qa.answer);
  };

  const goToIA = () => {
    try {
      // @ts-ignore
      navigation.navigate({ name: 'IA' });
    } catch {
      navigation.navigate('IAScreen' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
       colors={['#080809cf', '#0529f5d8', '#37fa06ff']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Todo')}
          >
            <Ionicons name="arrow-back" size={34} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Asistente Inteligente</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              Alert.alert(
                '🧠 Asistente Inteligente',
                'Tengo:\n• Preguntas Frecuentes (Perfil/Agenda/Otras)\n• Preguntas Informativas (motos bajo y medio cilindraje, predefinidas en código)\n• Consultas: "últimos 5 registros" en Preventivo, General, Emergencia y Rutas.'
              )
            }
          >
            <Ionicons name="help-circle" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Chat */}
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => {
              const isUser = item.sender === 'user';
              return (
                <View
                  style={[
                    styles.messageContainer,
                    isUser ? styles.userMessageContainer : styles.botMessageContainer,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.botAvatar}>
                      <Image
                        source={require('../../assets/imagen/help2.png')}
                        style={styles.botAvatarImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userMessageBubble : styles.botMessageBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.botMessageText,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={[
                        styles.timestamp,
                        isUser ? styles.userTimestamp : styles.botTimestamp,
                      ]}
                    >
                      {item.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {isUser && (
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={20} color="white" />
                    </View>
                  )}
                </View>
              );
            }}
            keyExtractor={(it) => it.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Estado */}
        {isProcessing && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>🧠 Analizando…</Text>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={goToIA}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#09f705ff', '#0eb9e3', '#20fd03ff']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="hardware-chip" size={22} color="white" />
              <Text style={styles.actionButtonText}>  IA Avanzada</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => { setShowFrequent(s => !s); setShowInformative(false); }}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#0509f7ff', '#0eb9e3', '#0509f7ff']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="help-circle" size={22} color="white" />
              <Text style={styles.actionButtonText}>  Preguntas Frecuentes</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => { setShowInformative(s => !s); setShowFrequent(false); }}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#0509f7ff', '#0eb9e3', '#0509f7ff']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="information-circle" size={22} color="white" />
              <Text style={styles.actionButtonText}>  Preguntas Informativas</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Panel Preguntas Frecuentes */}
        {showFrequent && (
          <View style={styles.questionsPanel}>
            <View style={styles.questionsHeader}>
              <Text style={styles.questionsTitle}>Preguntas Frecuentes</Text>
              <TouchableOpacity onPress={() => setShowFrequent(false)}>
                <Ionicons name="close" size={24} color="#6E45E2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.questionsScroll} showsVerticalScrollIndicator>
              {[
                {
                  title: 'Perfil',
                  qs: [
                    '¿Cuándo vence el SOAT?',
                    'Vencimiento Técnico Mecánica',
                    '¿Qué día tengo Pico y Placa?',
                  ],
                },
                {
                  title: 'Agenda y Citas',
                  qs: [
                    'Agenda hoy',
                    'Agenda mañana',
                    'Agenda esta semana',
                    'Agenda este mes',
                    'Agenda próximo mes',
                  ],
                },
                { title: 'Preventivo',  qs: ['Últimos 5 registros en preventivo'] },
                { title: 'General',     qs: ['Últimos 5 registros en general'] },
                { title: 'Emergencia',  qs: ['Últimos 5 registros en emergencia'] },
                { title: 'Rutas',       qs: ['Últimos 5 registros en rutas'] },
              ].map((cat, cIdx) => (
                <View key={`faq-cat-${cIdx}`} style={styles.questionCategory}>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  {cat.qs.map((q, qIdx) => (
                    <TouchableOpacity
                      key={`faq-q-${cIdx}-${qIdx}`}
                      style={styles.questionButton}
                      onPress={() => selectQuick(q)}
                    >
                      <Text style={styles.questionText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Panel Preguntas Informativas */}
        {showInformative && (
          <View style={styles.questionsPanel}>
            <View style={styles.questionsHeader}>
              <Text style={styles.questionsTitle}>Preguntas Informativas</Text>
              <TouchableOpacity onPress={() => setShowInformative(false)}>
                <Ionicons name="close" size={24} color="#6E45E2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.questionsScroll} showsVerticalScrollIndicator>
              {INFORMATIVE_QA_CLEAN.map((cat, cIdx) => (
                <View key={`info-cat-${cIdx}`} style={styles.questionCategory}>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  {cat.qas.map((qa, qIdx) => (
                    <TouchableOpacity
                      key={`info-q-${cIdx}-${qIdx}`}
                      style={styles.questionButton}
                      onPress={() => selectInformative(qa)}
                    >
                      <Text style={styles.questionText}>{qa.question}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              {INFORMATIVE_QA_CLEAN.length === 0 && (
                <Text style={[styles.questionText, { opacity: 0.8 }]}>
                  No hay preguntas informativas configuradas.
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Pregunta…"
              placeholderTextColor="#999999ff"
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              editable={!isProcessing}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText || isProcessing) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText || isProcessing}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ChatBotsScreen;