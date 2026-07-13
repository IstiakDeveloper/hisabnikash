import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Filter, 
    Trash2, 
    Edit, 
    Image, 
    X,
    Info,
} from 'lucide-react';

const paymentMethodKeys: Record<string, string> = {
    cash: 'cash',
    mobile_banking: 'mobile_banking',
    bank: 'bank',
    credit_card: 'credit_card',
};

export default function Index(props: any) {
    const { t } = useTranslation();

    const {
        transactions = { data: [], links: [] },
        accounts = [],
        categories = [],
        spaces = [],
        filters = {}
    } = props;

    const [spaceId, setSpaceId] = useState(filters.space_id || 'combined');
    const [accountId, setAccountId] = useState(filters.account_id || '');
    const [categoryId, setCategoryId] = useState(filters.category_id || '');
    const [type, setType] = useState(filters.type || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editTx, setEditTx] = useState<any>(null);

    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editAccountId, setEditAccountId] = useState('');
    const [editSpaceId, setEditSpaceId] = useState('');
    const [editType, setEditType] = useState('expense');
    const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
    const [editIsFixed, setEditIsFixed] = useState(false);
    const [editNote, setEditNote] = useState('');

    const getPaymentMethodLabel = (method: string) => {
        const key = paymentMethodKeys[method];
        if (key) {
            return t(key, method.replace('_', ' '));
        }
        return method.replace('_', ' ');
    };

    const handleSearch = () => {
        router.get('/transactions', {
            space_id: spaceId,
            account_id: accountId,
            category_id: categoryId,
            type: type,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true });
    };

    const handleClearFilters = () => {
        setSpaceId('combined');
        setAccountId('');
        setCategoryId('');
        setType('');
        setDateFrom('');
        setDateTo('');
        router.get('/transactions', {});
    };

    const handleDelete = (id: number) => {
        if (confirm(t('delete_transaction_confirm', 'Are you sure you want to delete this transaction?'))) {
            router.delete('/transactions/' + id);
        }
    };

    const openEdit = (tx: any) => {
        setEditTx(tx);
        setEditAmount(tx.amount.toString());
        setEditDescription(tx.description || '');
        setEditCategoryId(tx.category_id?.toString() || '');
        setEditAccountId(tx.account_id?.toString() || '');
        setEditSpaceId(tx.space_id?.toString() || '');
        setEditType(tx.type);
        setEditPaymentMethod(tx.payment_method || 'cash');
        setEditIsFixed(tx.is_fixed);
        setEditNote(tx.note || '');
        setIsEditModalOpen(true);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTx) return;

        router.put('/transactions/' + editTx.id, {
            account_id: editAccountId,
            category_id: editCategoryId,
            space_id: editSpaceId,
            type: editType,
            amount: Number(editAmount),
            description: editDescription,
            transaction_date: editTx.transaction_date.substring(0, 10),
            note: editNote,
            is_fixed: editIsFixed ? 1 : 0,
            payment_method: editPaymentMethod,
            is_recurring: editTx.is_recurring ? 1 : 0,
            recurrence_period: editTx.recurrence_period,
        }, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setEditTx(null);
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('transactions_ledger', 'Transaction Ledger')} />

            <div className="space-y-6">
                
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('transactions_ledger', 'Transaction Ledger')}</h2>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                        <Filter className="w-4 h-4 text-emerald-500" />
                        <span>{t('filter_and_search', 'Filter & Search')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('space', 'Space / Profile')}</label>
                            <select
                                value={spaceId}
                                onChange={(e) => setSpaceId(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                            >
                                <option value="combined">{t('all_spaces', 'All Spaces')}</option>
                                {spaces.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('account', 'Account')}</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                            >
                                <option value="">{t('all_accounts', 'All Accounts')}</option>
                                {accounts.map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category', 'Category')}</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                            >
                                <option value="">{t('all_categories', 'All Categories')}</option>
                                {categories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('type_label', 'Type')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                            >
                                <option value="">{t('all_types', 'All Types')}</option>
                                <option value="income">{t('income', 'Income')}</option>
                                <option value="expense">{t('expense', 'Expense')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('date_from', 'From')}</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('date_to', 'To')}</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                        <button
                            onClick={handleSearch}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                        >
                            {t('apply_filters', 'Apply Filters')}
                        </button>
                        <button
                            onClick={handleClearFilters}
                            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 dark:text-slate-400 transition-all"
                        >
                            {t('clear', 'Clear')}
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {transactions.data.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl py-12 text-center space-y-2">
                            <Info className="w-8 h-8 text-gray-600 dark:text-slate-600 mx-auto" />
                            <p className="text-xs text-gray-500 dark:text-slate-500">{t('no_transactions_found', 'No transactions found.')}</p>
                        </div>
                    ) : (
                        transactions.data.map((tx: any) => (
                            <div key={tx.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800/80 p-4 rounded-3xl space-y-3.5 transition-all hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700">
                                
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-950 flex items-center justify-center text-lg border border-gray-200 dark:border-slate-800">
                                            {tx.category?.icon || '📦'}
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-gray-900 dark:text-slate-100 block truncate max-w-[170px]">
                                                {tx.description || tx.category?.name}
                                            </span>
                                            <span className="text-[9px] text-gray-500 dark:text-slate-500 block">
                                                {tx.account?.name} • {tx.transaction_date.substring(0, 10)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <span className={`text-sm font-black block ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {tx.type === 'income' ? '+' : '-'}৳{number_format(tx.amount)}
                                        </span>
                                        
                                        <div className="flex items-center justify-end space-x-1.5">
                                            {tx.is_fixed && (
                                                <span className="text-[8px] bg-gray-50 dark:bg-slate-950 text-rose-400 border border-rose-500/10 px-1.5 py-0.5 rounded-full uppercase font-bold">
                                                    {t('fixed', 'Fixed')}
                                                </span>
                                            )}
                                            {tx.space && (
                                                <span className="text-[8px] bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-800 px-1.5 py-0.5 rounded-full uppercase font-semibold">
                                                    {tx.space.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-200 dark:border-slate-800 text-xs">
                                    <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-semibold">
                                        {getPaymentMethodLabel(tx.payment_method || 'cash')}
                                    </span>
                                    
                                    <div className="flex items-center space-x-2">
                                        {tx.receipt_image && (
                                            <button 
                                                onClick={() => setSelectedReceiptUrl(`/storage/${tx.receipt_image}`)}
                                                className="p-1.5 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-800"
                                            >
                                                <Image className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => openEdit(tx)}
                                            className="p-1.5 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-blue-400 hover:text-blue-300 border border-gray-200 dark:border-slate-800"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(tx.id)}
                                            className="p-1.5 bg-gray-50 dark:bg-slate-950 hover:bg-rose-950/20 rounded-lg text-rose-500 hover:text-rose-400 border border-gray-200 dark:border-slate-800"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {transactions.links && transactions.links.length > 3 && (
                    <div className="flex items-center justify-center space-x-1 pt-2">
                        {transactions.links.map((link: any, index: number) => {
                            if (link.label.includes('Previous') || link.label.includes('Next')) return null;
                            return (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        link.active 
                                            ? 'bg-emerald-600 text-white shadow-lg' 
                                            : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-800'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedReceiptUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedReceiptUrl(null)}>
                    <div className="relative max-w-full max-h-full">
                        <img src={selectedReceiptUrl} className="max-w-md max-h-[80vh] rounded-3xl border border-gray-300 dark:border-slate-700 shadow-2xl" alt={t('receipt', 'Receipt')} />
                        <button 
                            onClick={() => setSelectedReceiptUrl(null)}
                            className="absolute -top-4 -right-4 w-9 h-9 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-white rounded-full flex items-center justify-center shadow-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <>
                    <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-45 space-y-5 animate-slide-up max-h-[85%] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('edit_transaction_title', 'Edit Transaction')}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('amount_bdt', 'Amount (BDT)')}</label>
                                <input
                                    type="number"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-lg font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('space', 'Space / Profile')}</label>
                                <select
                                    value={editSpaceId}
                                    onChange={(e) => setEditSpaceId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {spaces.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category', 'Category')}</label>
                                <select
                                    value={editCategoryId}
                                    onChange={(e) => setEditCategoryId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('description', 'Description')}</label>
                                <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('account', 'Account')}</label>
                                <select
                                    value={editAccountId}
                                    onChange={(e) => setEditAccountId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {accounts.map((a: any) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('payment_method', 'Payment Method')}</label>
                                <select
                                    value={editPaymentMethod}
                                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    <option value="cash">{t('payment_cash_option', '💵 Cash')}</option>
                                    <option value="mobile_banking">{t('payment_mobile_banking_option', '📱 Mobile Banking (bKash/Nagad)')}</option>
                                    <option value="bank">{t('payment_bank_option', '🏦 Bank')}</option>
                                    <option value="credit_card">{t('payment_credit_card_option', '💳 Credit Card')}</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl">
                                <span className="text-xs font-bold">{t('fixed_spending_label', 'Fixed Spending')}</span>
                                <input
                                    type="checkbox"
                                    checked={editIsFixed}
                                    onChange={(e) => setEditIsFixed(e.target.checked)}
                                    className="w-5 h-5 rounded-md border-gray-200 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('note_optional', 'Note (Optional)')}</label>
                                <textarea
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    rows={2}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('confirm_changes', 'Confirm Changes')}
                            </button>
                        </form>
                    </div>
                </>
            )}
        </AuthenticatedLayout>
    );
}
