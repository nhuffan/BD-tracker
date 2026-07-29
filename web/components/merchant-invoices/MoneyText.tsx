"use client";

export default function MoneyText({
  amount,
  className = "",
  amountClassName = "",
  currencyClassName = "",
}: {
  amount?: number | null;
  className?: string;
  amountClassName?: string;
  currencyClassName?: string;
}) {
  const value = Number(amount ?? 0);
  const displayAmount = Number.isFinite(value)
    ? new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 0,
      }).format(value)
    : "0";

  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap align-middle leading-none ${className}`}>
      <span className={amountClassName}>{displayAmount}</span>
      <span className={`leading-none ${currencyClassName}`}>₫</span>
    </span>
  );
}
