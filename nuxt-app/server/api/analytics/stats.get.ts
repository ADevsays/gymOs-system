import { defineEventHandler, getQuery } from 'h3';
import { getAnalyticsStats, type AnalyticsPeriod } from '~~/server/services/analyticsService';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const period = (query.period as AnalyticsPeriod) || '30d';
    const attendancePeriod = (query.attendancePeriod as AnalyticsPeriod) || period;
    const churnPeriod = (query.churnPeriod as AnalyticsPeriod) || period;
    const revenuePeriod = (query.revenuePeriod as AnalyticsPeriod) || period;

    const data = await getAnalyticsStats({
      period,
      attendancePeriod,
      churnPeriod,
      revenuePeriod,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
