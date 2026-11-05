const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Interpreta una fecha almacenada como fecha de calendario local.
 *
 * Las fechas de suscripciones se guardan como ISO con hora, pero la interfaz
 * las comunica como días completos. Tomar sólo YYYY-MM-DD evita que la hora y
 * la zona horaria adelanten o atrasen el indicador de vencimiento.
 */
export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function startOfCalendarDay(value: Date = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function calendarDaysUntil(value: string, from: Date = new Date()): number {
  return Math.round((parseCalendarDate(value).getTime() - startOfCalendarDay(from).getTime()) / MS_PER_DAY);
}

export function calendarDaysBetween(first: Date, second: Date): number {
  return Math.round((startOfCalendarDay(first).getTime() - startOfCalendarDay(second).getTime()) / MS_PER_DAY);
}

export function formatCalendarDate(value: string): string {
  return parseCalendarDate(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
