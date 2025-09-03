import React from 'react';
import { useForm } from '@inertiajs/react';
import { cn } from '@/utils/cn';

interface Loan {
  id?: number;
  type: 'taken' | 'given';
  person_name: string;
  person_phone?: string;
  amount: number;
  loan_date: string;
  due_date?: string;
  note?: string;
  interest_rate?: number;
}

interface Props {
  loan?: Partial<Loan>;
  onSubmit: (data: any) => void;
  submitLabel?: string;
}

export default function LoanForm({
  loan,
  onSubmit,
  submitLabel = 'Save Loan'
}: Props) {
  const { data, setData, processing, errors } = useForm({
    type: loan?.type || 'taken',
    person_name: loan?.person_name || '',
    person_phone: loan?.person_phone || '',
    amount: loan?.amount || '',
    loan_date: loan?.loan_date || new Date().toISOString().split('T')[0],
    due_date: loan?.due_date || '',
    note: loan?.note || '',
    interest_rate: loan?.interest_rate || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Loan Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setData('type', 'taken')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-center",
              data.type === 'taken'
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                : "border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600"
            )}
          >
            <div className="text-2xl mb-1">📥</div>
            <div className="font-medium">Loan Taken</div>
            <div className="text-xs text-gray-500">I borrowed money</div>
          </button>
          <button
            type="button"
            onClick={() => setData('type', 'given')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-center",
              data.type === 'given'
                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600"
            )}
          >
            <div className="text-2xl mb-1">📤</div>
            <div className="font-medium">Loan Given</div>
            <div className="text-xs text-gray-500">I lent money</div>
          </button>
        </div>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
      </div>

      {/* Person Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {data.type === 'taken' ? 'Lender Name' : 'Borrower Name'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.person_name}
          onChange={(e) => setData('person_name', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder={data.type === 'taken' ? 'Who did you borrow from?' : 'Who did you lend to?'}
          required
        />
        {errors.person_name && <p className="text-red-500 text-sm mt-1">{errors.person_name}</p>}
      </div>

      {/* Person Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone Number (Optional)
        </label>
        <input
          type="tel"
          value={data.person_phone}
          onChange={(e) => setData('person_phone', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Enter phone number"
        />
        {errors.person_phone && <p className="text-red-500 text-sm mt-1">{errors.person_phone}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Loan Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">৳</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.amount}
            onChange={(e) => setData('amount', e.target.value)}
            className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00"
            required
          />
        </div>
        {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
      </div>

      {/* Loan Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Loan Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={data.loan_date}
          onChange={(e) => setData('loan_date', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
        {errors.loan_date && <p className="text-red-500 text-sm mt-1">{errors.loan_date}</p>}
      </div>

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Due Date (Optional)
        </label>
        <input
          type="date"
          value={data.due_date}
          onChange={(e) => setData('due_date', e.target.value)}
          min={data.loan_date}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        {errors.due_date && <p className="text-red-500 text-sm mt-1">{errors.due_date}</p>}
      </div>

      {/* Interest Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Interest Rate % (Optional)
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={data.interest_rate}
            onChange={(e) => setData('interest_rate', e.target.value)}
            className="w-full px-3 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">%</span>
        </div>
        {errors.interest_rate && <p className="text-red-500 text-sm mt-1">{errors.interest_rate}</p>}
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Note (Optional)
        </label>
        <textarea
          value={data.note}
          onChange={(e) => setData('note', e.target.value)}
          rows={3}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Add any additional details"
        />
        {errors.note && <p className="text-red-500 text-sm mt-1">{errors.note}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={processing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
      >
        {processing ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
