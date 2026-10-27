'use client';

import { useQuery } from '@tanstack/react-query';
import { getDifferentialReport, getReportsSnapshot } from '@/api/reports.api';
import { queryKeys } from '@/hooks/queries/keys';

export function useReportsQuery() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: getReportsSnapshot,
  });
}

export function useDifferentialQuery() {
  return useQuery({ queryKey: queryKeys.differential, queryFn: getDifferentialReport });
}
