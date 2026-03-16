import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { UsageLog } from '../types';

/**
 * Service for filtering and searching logs
 */
export class FilterService {
  /**
   * Filters logs based on date range and professor name
   */
  static filterLogs(
    logs: UsageLog[],
    searchTerm: string,
    startDate: Date | null,
    endDate: Date | null
  ): UsageLog[] {
    return logs.filter(log => {
      const logDate = parseISO(log.timestamp);
      
      // 1. Date Range Filter
      let matchesDate = true;
      if (startDate && endDate) {
        matchesDate = isWithinInterval(logDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate)
        });
      } else if (startDate) {
        matchesDate = logDate >= startOfDay(startDate);
      } else if (endDate) {
        matchesDate = logDate <= endOfDay(endDate);
      }

      // 2. Search Filter (Professor Name)
      const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesSearch;
    });
  }

  /**
   * Sorts logs by timestamp
   */
  static sortLogs(logs: UsageLog[], direction: 'asc' | 'desc' = 'desc'): UsageLog[] {
    return [...logs].sort((a, b) => {
      const dateA = parseISO(a.timestamp).getTime();
      const dateB = parseISO(b.timestamp).getTime();
      return direction === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }
}
