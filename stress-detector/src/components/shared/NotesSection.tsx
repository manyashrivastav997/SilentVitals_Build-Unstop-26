import { useEffect, useMemo, useState } from 'react'
import { addClinicalNote, getClinicalNotes } from '../../db/indexedDb'
import type { ClinicalNote } from '../../types/db'

export interface NotesSectionProps {
  patientId: string
  canAddNotes: boolean
  currentUserId: string
  currentUserName: string
  currentUserRole: 'doctor' | 'nurse'
}

function roleBadge(role: string) {
  if (role === 'doctor') return 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30'
  if (role === 'nurse') return 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/30'
  return 'bg-slate-700/40 text-slate-200 ring-1 ring-slate-600/40'
}

export function NotesSection({
  patientId,
  canAddNotes,
  currentUserId,
  currentUserName,
  currentUserRole,
}: NotesSectionProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    const updated = await getClinicalNotes(patientId)
    setNotes(updated)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const sorted = useMemo(() => {
    return notes
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [notes])

  const save = async () => {
    const text = newNote.trim()
    if (!canAddNotes || !text) return
    setSaving(true)
    setError(null)
    try {
      const note: ClinicalNote = {
        id: `note-${patientId}-${Date.now()}`,
        patientId,
        authorId: currentUserId,
        authorName: currentUserName,
        role: currentUserRole,
        text,
        createdAt: new Date(),
      }
      await addClinicalNote(note)
      setNewNote('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl bg-slate-900/50 border border-teal-800/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">📝 Clinical Notes</h2>
        <span className="text-[11px] text-slate-500">Add-only (no edit/delete)</span>
      </div>

      {canAddNotes && (
        <div className="mt-3 rounded-xl bg-slate-950/50 ring-1 ring-teal-800/30 p-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a nursing note…"
            className="h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Visible to doctors and nurses.
            </p>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || newNote.trim().length === 0}
              className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
        </div>
      )}

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="text-sm text-slate-500">No notes yet for this patient.</p>
        )}
        {sorted.map((n) => (
          <article
            key={n.id}
            className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800/70"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12px] font-semibold text-slate-100">{n.authorName}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadge(n.role)}`}>
                {n.role}
              </span>
              <span className="text-[10px] text-slate-500">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{n.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

