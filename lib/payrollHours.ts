export function calculateRegularPay(
  dailyRate: number | null | undefined,
  paidRegularHours: number | null | undefined,
  hoursPerDay: number,
): number {
  const rate = Number(dailyRate);
  const hours = Number(paidRegularHours);
  if (
    !Number.isFinite(rate) ||
    rate < 0 ||
    !Number.isFinite(hours) ||
    hours < 0 ||
    !Number.isFinite(hoursPerDay) ||
    hoursPerDay <= 0
  ) {
    return 0;
  }

  return hours * (rate / hoursPerDay);
}
