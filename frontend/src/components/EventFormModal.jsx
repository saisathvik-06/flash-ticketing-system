import { useMemo, useState } from 'react';
import { X, Plus, Trash2, Lock } from 'lucide-react';
import { THEMES } from '../lib/theme';
import { CATEGORIES } from '../lib/categories';

const THEME_KEYS = Object.keys(THEMES);

function toDateTimeLocalValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function defaultDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(19, 30, 0, 0);
  return d;
}

function makeTier(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: '',
    price: 0,
    rows: [],
    ...overrides,
  };
}

function initialStateFor(event) {
  if (!event) {
    return {
      name: '',
      category: 'Movie',
      venue: '',
      description: '',
      dateTime: toDateTimeLocalValue(defaultDateTime()),
      theme: 'violet',
      rowCount: 10,
      cols: 10,
      tiers: [
        makeTier({ name: 'VIP', price: 999, rows: ['A', 'B', 'C'] }),
        makeTier({ name: 'Premium', price: 599, rows: ['D', 'E', 'F', 'G'] }),
        makeTier({ name: 'Standard', price: 349, rows: ['H', 'I', 'J'] }),
      ],
    };
  }

  return {
    name: event.name,
    category: event.category,
    venue: event.venue,
    description: event.description || '',
    dateTime: toDateTimeLocalValue(event.dateTime),
    theme: event.theme,
    rowCount: event.rows.length,
    cols: event.cols,
    tiers: event.tiers.map((t) => makeTier({ name: t.name, price: t.price, rows: [...t.rows] })),
  };
}

export default function EventFormModal({ event, bookedCount = 0, saving, onSubmit, onClose }) {
  const isEdit = Boolean(event);
  const layoutLocked = isEdit && bookedCount > 0;

  const [form, setForm] = useState(() => initialStateFor(event));
  const [error, setError] = useState('');

  const rowLetters = useMemo(
    () => Array.from({ length: Math.max(0, Math.min(26, Number(form.rowCount) || 0)) }, (_, i) =>
      String.fromCharCode(65 + i)
    ),
    [form.rowCount]
  );

  // Changing the row count can orphan rows that tiers had claimed — trim them
  // right in the handler (not an effect) so it's a single, synchronous update.
  function updateRowCount(value) {
    const nextCount = Math.max(0, Math.min(26, Number(value) || 0));
    const nextLetters = new Set(
      Array.from({ length: nextCount }, (_, i) => String.fromCharCode(65 + i))
    );
    setForm((prev) => ({
      ...prev,
      rowCount: value,
      tiers: prev.tiers.map((t) => ({ ...t, rows: t.rows.filter((r) => nextLetters.has(r)) })),
    }));
  }

  const unassignedRows = useMemo(
    () => rowLetters.filter((r) => !form.tiers.some((t) => t.rows.includes(r))),
    [rowLetters, form.tiers]
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTier(id, field, value) {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    }));
  }

  function assignRow(rowLetter, tierId) {
    if (layoutLocked) return;
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => {
        if (t.id === tierId) {
          const has = t.rows.includes(rowLetter);
          return { ...t, rows: has ? t.rows.filter((r) => r !== rowLetter) : [...t.rows, rowLetter] };
        }
        return { ...t, rows: t.rows.filter((r) => r !== rowLetter) };
      }),
    }));
  }

  function addTier() {
    if (layoutLocked) return;
    setForm((prev) => ({ ...prev, tiers: [...prev.tiers, makeTier()] }));
  }

  function removeTier(id) {
    if (layoutLocked || form.tiers.length <= 1) return;
    setForm((prev) => ({ ...prev, tiers: prev.tiers.filter((t) => t.id !== id) }));
  }

  function validate() {
    if (!form.name.trim()) return 'Title is required.';
    if (!form.venue.trim()) return 'Venue is required.';
    if (Number.isNaN(new Date(form.dateTime).getTime())) return 'A valid date & time is required.';
    if (rowLetters.length === 0) return 'The event needs at least one row.';
    if (!Number.isInteger(Number(form.cols)) || Number(form.cols) < 1) {
      return 'Seats per row must be a positive whole number.';
    }
    if (unassignedRows.length > 0) {
      return `Row${unassignedRows.length > 1 ? 's' : ''} ${unassignedRows.join(', ')} ${
        unassignedRows.length > 1 ? "aren't" : "isn't"
      } assigned to a pricing tier.`;
    }
    const names = new Set();
    for (const t of form.tiers) {
      if (!t.name.trim()) return 'Every pricing tier needs a name.';
      if (names.has(t.name.trim().toLowerCase())) return `Tier name "${t.name}" is used more than once.`;
      names.add(t.name.trim().toLowerCase());
      if (!Number.isFinite(Number(t.price)) || Number(t.price) < 0) {
        return `Tier "${t.name}" needs a valid non-negative price.`;
      }
    }
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'General',
      venue: form.venue.trim(),
      description: form.description,
      dateTime: new Date(form.dateTime).toISOString(),
      theme: form.theme,
      rows: rowLetters,
      cols: Number(form.cols),
      tiers: form.tiers.map((t) => ({
        name: t.name.trim(),
        price: Number(t.price),
        rows: t.rows,
      })),
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={saving ? undefined : onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl bg-[#10121b] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 my-4 animate-fade-in"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Event' : 'Create Event'}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {layoutLocked && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-xs text-amber-300">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {bookedCount} seat{bookedCount > 1 ? 's are' : ' is'} already booked for this event, so the
                seat grid and tier row assignments are locked. You can still edit the title, category,
                venue, description, date, theme, and tier names/prices.
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* ── Basics ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title" className="sm:col-span-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="The Grand Premiere"
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Category">
              <input
                type="text"
                list="event-categories"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="Movie"
                className={inputClasses}
              />
              <datalist id="event-categories">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field label="Venue">
              <input
                type="text"
                value={form.venue}
                onChange={(e) => update('venue', e.target.value)}
                placeholder="PVR IMAX, Downtown"
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Date & time">
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => update('dateTime', e.target.value)}
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Theme">
              <div className="flex flex-wrap gap-2">
                {THEME_KEYS.map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => update('theme', key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      form.theme === key
                        ? 'border-white/30 bg-white/[0.08] text-white'
                        : 'border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.16]'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${THEMES[key].dot}`} />
                    {key}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="A short description shown on the event page."
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </Field>
          </div>

          {/* ── Seat layout ── */}
          <div>
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Seat layout
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Rows">
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={form.rowCount}
                  disabled={layoutLocked}
                  onChange={(e) => updateRowCount(e.target.value)}
                  className={`${inputClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </Field>
              <Field label="Seats per row">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={form.cols}
                  disabled={layoutLocked}
                  onChange={(e) => update('cols', e.target.value)}
                  className={`${inputClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </Field>
            </div>

            {/* ── Tiers ── */}
            <div className="space-y-3">
              {form.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                      placeholder="Tier name"
                      className={`${inputClasses} flex-1`}
                    />
                    <div className="relative shrink-0 w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={tier.price}
                        onChange={(e) => updateTier(tier.id, 'price', e.target.value)}
                        className={`${inputClasses} pl-6`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(tier.id)}
                      disabled={layoutLocked || form.tiers.length <= 1}
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Remove tier ${tier.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rowLetters.map((row) => {
                      const active = tier.rows.includes(row);
                      return (
                        <button
                          type="button"
                          key={row}
                          onClick={() => assignRow(row, tier.id)}
                          disabled={layoutLocked}
                          className={`w-7 h-7 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            active
                              ? 'bg-violet-500/25 border-violet-400/60 text-violet-200'
                              : 'bg-white/[0.02] border-white/[0.08] text-gray-600 hover:text-gray-300 hover:border-white/[0.16]'
                          }`}
                        >
                          {row}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addTier}
              disabled={layoutLocked}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-white/[0.12] text-gray-400 hover:text-gray-200 hover:border-white/[0.24] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Add tier
            </button>

            {unassignedRows.length > 0 && (
              <p className="mt-3 text-xs text-amber-400">
                Unassigned row{unassignedRows.length > 1 ? 's' : ''}: {unassignedRows.join(', ')} — click a
                row letter under a tier to assign it.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] text-gray-400 text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClasses =
  'w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-colors';

function Field({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
