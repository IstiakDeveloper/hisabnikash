<?php

namespace App\Http\Controllers;

use App\Models\Note;
use App\Models\Space;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class NoteController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');
        $search = $request->query('search');

        $query = Note::with('space')->where('user_id', $user->id);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('content', 'like', "%{$search}%")
                  ->orWhere('tags', 'like', "%{$search}%");
            });
        }

        $notes = $query->latest()->get();
        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        return Inertia::render('Notes/Index', [
            'notes' => $notes,
            'spaces' => $spaces,
            'filters' => $request->only(['space_id', 'search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'content' => 'required|string|max:10000',
            'space_id' => 'required|exists:spaces,id',
            'linked_type' => 'nullable|string|max:50',
            'linked_id' => 'nullable|integer',
            'tags' => 'nullable|string|max:255',
        ]);

        Note::create([
            'user_id' => auth()->id(),
            'space_id' => $validated['space_id'],
            'content' => $validated['content'],
            'linked_type' => $validated['linked_type'] ?? null,
            'linked_id' => $validated['linked_id'] ?? null,
            'tags' => ($validated['tags'] ?? null) ? strtolower(str_replace(' ', '', $validated['tags'])) : null,
        ]);

        return redirect()->back()->with('success', 'নোট সফলভাবে যুক্ত হয়েছে।');
    }

    public function update(Request $request, Note $note): RedirectResponse
    {
        if ($note->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:10000',
            'space_id' => 'required|exists:spaces,id',
            'tags' => 'nullable|string|max:255',
        ]);

        $note->update([
            'content' => $validated['content'],
            'space_id' => $validated['space_id'],
            'tags' => ($validated['tags'] ?? null) ? strtolower(str_replace(' ', '', $validated['tags'])) : null,
        ]);

        return redirect()->back()->with('success', 'নোট সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(Note $note): RedirectResponse
    {
        if ($note->user_id !== auth()->id()) {
            abort(403);
        }

        $note->delete();
        return redirect()->back()->with('success', 'নোট সফলভাবে মুছে ফেলা হয়েছে।');
    }
}
