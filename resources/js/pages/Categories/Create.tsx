import React, { useState } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation';

const COMMON_ICONS = [
  // Food & Drink
  '🍔', '🍕', '🍜', '☕', '🍹', '🍎', '🍰',
  // Transportation
  '🚗', '⛽', '🚌', '🚕', '✈️', '🚲', '🚂',
  // Home & Utilities
  '🏠', '💡', '🔌', '💧', '📶', '🧹', '🔑',
  // Health & Care
  '🏥', '💊', '🩹', '🦷', '🏋️', '🧼', '💇',
  // Education & Work
  '🎓', '📚', '✏️', '💻', '💼', '📊', '📎',
  // Shopping & Entertainment
  '🛒', '🎁', '🎬', '🎮', '🎵', '🎟️', '🛍️',
  // Finance & Wealth
  '💰', '🏦', '💳', '📈', '💵', '🪙', '🐷',
  // Personal & Miscellaneous
  '👕', '👗', '👟', '🕶️', '📦', '🔔', '❤️', '🏖️'
];

const COMMON_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];

interface Props {
  spaces: any[];
}

export default function Create({ spaces = [] }: Props) {
  const { t } = useTranslation();
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const { data, setData, post, processing, errors } = useForm({
    type: 'expense',
    name: '',
    icon: '📁',
    color: '#3B82F6',
    monthly_limit: '',
    is_active: true,
    is_fixed: false,
    space_id: spaces.find((s: any) => s.is_default)?.id || spaces[0]?.id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/categories');
  };

  return (
    <AuthenticatedLayout showFAB={false}>
      <Head title={t('create_new_category', 'Create New Category')} />

      <div className="py-6 lg:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/categories"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              {t('back_to_categories', 'Back to categories')}
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('create_new_category', 'Create New Category')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('add_category_desc', 'Add a new category for organizing your transactions')}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('category_type', 'Category Type')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setData('type', 'expense')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                      data.type === 'expense'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">💸</div>
                    <div className="font-medium">{t('expense', 'Expense')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setData('type', 'income')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                      data.type === 'income'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">💰</div>
                    <div className="font-medium">{t('income', 'Income')}</div>
                  </button>
                </div>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('category_name', 'Category Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('category_name_placeholder', 'e.g., Food & Dining, Transportation')}
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('space', 'Space / Profile')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={data.space_id}
                  onChange={(e) => setData('space_id', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">{t('select_space', 'Select Space')}</option>
                  {spaces.map((space: any) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
                {errors.space_id && <p className="text-red-500 text-sm mt-1">{errors.space_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('icon', 'Icon')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-3">
                  {COMMON_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(icon);
                        setData('icon', icon);
                      }}
                      className={`p-2 sm:p-3 text-xl sm:text-2xl rounded-lg border-2 transition-all ${
                        data.icon === icon
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                {errors.icon && <p className="text-red-500 text-sm mt-1">{errors.icon}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('color', 'Color')} <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        setData('color', color);
                      }}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        data.color === color
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={data.color}
                  onChange={(e) => {
                    setData('color', e.target.value);
                    setSelectedColor(e.target.value);
                  }}
                  className="w-full h-12 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                />
                {errors.color && <p className="text-red-500 text-sm mt-1">{errors.color}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('monthly_limit_optional', 'Monthly Limit (Optional)')}
                </label>
                <input
                  type="number"
                  value={data.monthly_limit}
                  onChange={(e) => setData('monthly_limit', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('monthly_limit_desc', 'Set a monthly spending limit for this category')}
                </p>
                {errors.monthly_limit && <p className="text-red-500 text-sm mt-1">{errors.monthly_limit}</p>}
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                    className="h-4 w-4 text-blue-650 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {t('category_active_label', 'Active (category will be available for transactions)')}
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_fixed"
                    checked={data.is_fixed}
                    onChange={(e) => setData('is_fixed', e.target.checked)}
                    className="h-4 w-4 text-blue-650 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_fixed" className="ml-2 block text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {t('is_fixed_spending_q', 'Is this fixed spending? (Fixed Expense)')}
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('preview', 'Preview')}</p>
                <div className="flex items-center space-x-3">
                  <div
                    className="text-3xl p-2 rounded-lg"
                    style={{ backgroundColor: `${data.color}20` }}
                  >
                    {data.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.name || t('category_name', 'Category Name')}
                    </p>
                    {data.monthly_limit && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('limit_label', 'Limit')}: ৳{parseFloat(data.monthly_limit).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/categories"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('cancel', 'Cancel')}
                </Link>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? t('creating', 'Creating...') : t('create_category', 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
