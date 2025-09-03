export const formatCurrency = (amount: number | string): string => {
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return '৳0.00';
  }

  // Format with proper locale
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount).replace('BDT', '৳');
};

// Alternative simple formatter (if Intl doesn't work properly)
export const formatCurrencySimple = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '৳0.00';
  }

  // Simple number formatting
  return `৳${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatRelativeDate = (date: string | Date): string => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = now.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return formatDate(date);
};

export const getAccountTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    bank: '🏦',
    mobile_banking: '📱',
    cash: '💵',
    card: '💳'
  };
  return icons[type] || '💰';
};
