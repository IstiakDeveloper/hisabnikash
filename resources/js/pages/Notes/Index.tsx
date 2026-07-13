import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Plus, 
    Trash2, 
    X, 
    Search, 
    Tag,
    Calendar,
} from 'lucide-react';

export default function Index(props: any) {
    const { t } = useTranslation();
    const {
        notes = [],
        spaces = [],
        filters = {}
    } = props;

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [content, setContent] = useState('');
    const [spaceId, setSpaceId] = useState(spaces[0]?.id?.toString() || '');
    const [tags, setTags] = useState('');

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [filterSpaceId, setFilterSpaceId] = useState(filters.space_id || 'combined');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/notes', {
            search: searchQuery,
            space_id: filterSpaceId
        }, { preserveState: true });
    };

    const handleClear = () => {
        setSearchQuery('');
        setFilterSpaceId('combined');
        router.get('/notes', {});
    };

    const submitAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/notes', {
            content,
            space_id: spaceId,
            tags
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                setContent('');
                setTags('');
            }
        });
    };

    const handleDelete = (id: number) => {
        if (confirm(t('delete_note_confirm', 'Are you sure you want to delete this note?'))) {
            router.delete('/notes/' + id);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('financial_journal', 'Financial Journal')} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('financial_journal', 'Financial Journal')}</h2>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('write_note', 'Write Note')}</span>
                    </button>
                </div>

                <form onSubmit={handleSearch} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4.5 space-y-3.5">
                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('search_by_content_tags', 'Search by content or tags...')}
                                className="block w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>
                        <select
                            value={filterSpaceId}
                            onChange={(e) => setFilterSpaceId(e.target.value)}
                            className="px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-700 dark:text-slate-300"
                        >
                            <option value="combined">{t('all_spaces', 'All Spaces')}</option>
                            {spaces.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex space-x-2 text-xs font-bold">
                        <button type="submit" className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 py-2 rounded-xl text-gray-700 dark:text-slate-300 transition-all hover:bg-gray-100 dark:hover:bg-slate-800">
                            {t('search', 'Search')}
                        </button>
                        <button type="button" onClick={handleClear} className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-500 dark:text-slate-500">
                            {t('clear', 'Clear')}
                        </button>
                    </div>
                </form>

                <div className="space-y-4">
                    {notes.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl py-12 text-center text-xs text-gray-500 dark:text-slate-500">
                            {t('no_notes_found', 'No diary notes found.')}
                        </div>
                    ) : (
                        notes.map((note: any) => (
                            <div key={note.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                                <div className="flex items-center justify-between text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 border-b border-gray-200 dark:border-gray-200 dark:border-slate-800 pb-2.5">
                                    <span className="flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" /> {note.created_at.substring(0, 10)} • {note.space?.name || t('general_space', 'General Space')}
                                    </span>
                                    
                                    <button onClick={() => handleDelete(note.id)} className="text-gray-500 dark:text-slate-500 hover:text-rose-500 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {note.content}
                                </p>

                                {note.tags && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {note.tags.split(',').map((tag: string, index: number) => (
                                            <span key={index} className="text-[9px] bg-gray-50 dark:bg-slate-950 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/10 font-bold flex items-center">
                                                <Tag className="w-2.5 h-2.5 mr-1" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isAddOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('write_financial_journal', 'Write Financial Journal')}</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitAddNote} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('note_content_label', 'Note Content')}</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={t('note_content_placeholder', 'Write context about a transaction, family loan terms, or business notes...')}
                                    required
                                    rows={4}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('linked_space', 'Linked Space')}</label>
                                <select
                                    value={spaceId}
                                    onChange={(e) => setSpaceId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {spaces.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('tags', 'Tags (comma separated)')}</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder={t('tags_placeholder', 'e.g.: family, business, rent')}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('save_note', 'Save Note')}
                            </button>
                        </form>
                    </div>
                </>
            )}

        </AuthenticatedLayout>
    );
}
