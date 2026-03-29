// ── UploadZone — defined OUTSIDE IcsModal so React never remounts it ──
function UploadZone({
  week,
  data,
  dark,
  onFile,
}: {
  week: 'A' | 'B';
  data: ClassPeriod[] | null;
  dark: boolean;
  onFile: (file: File, week: 'A' | 'B') => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f, week);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className={`relative w-full rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
        data
          ? week === 'A'
            ? 'border-blue-400/50 bg-blue-500/5'
            : 'border-purple-400/50 bg-purple-500/5'
          : dark
            ? 'border-white/10 hover:border-white/25'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".ics"
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f, week);
          e.target.value = '';
        }}
      />

      {data ? (
        <>
          <div className={`text-2xl font-mono font-light mb-1 ${week === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>
            {data.length}
          </div>
          <div className={`text-xs font-mono ${week === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>
            classes loaded
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 font-mono">
            click to replace
          </div>
        </>
      ) : (
        <>
          <Upload className={`w-6 h-6 mx-auto mb-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
          <div className={`text-xs font-mono font-medium ${week === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>
            Week {week}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            drop .ics or click
          </div>
        </>
      )}
    </div>
  );
}

// ── ICS MODAL ─────────────────────────────────────────────────────────
function IcsModal({
  dark,
  onClose,
  onImport,
}: {
  dark: boolean;
  onClose: () => void;
  onImport: (weekA: ClassPeriod[], weekB: ClassPeriod[]) => Promise<void>;
}) {
  const [weekA, setWeekA] = React.useState<ClassPeriod[] | null>(null);
  const [weekB, setWeekB] = React.useState<ClassPeriod[] | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const readFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res((e.target?.result as string) ?? '');
      r.onerror = () => rej(new Error('Could not read file'));
      r.readAsText(file);
    });

  const handleFile = async (file: File, week: 'A' | 'B') => {
    setErr('');
    try {
      const text = await readFile(file);

      if (!text.includes('BEGIN:VCALENDAR')) {
        setErr(`Week ${week}: not a valid .ics file`);
        return;
      }

      const parsed = parseIcsToClasses(text);

      if (!parsed.length) {
        setErr(`Week ${week}: no weekday classes found`);
        return;
      }

      if (week === 'A') setWeekA(parsed);
      else setWeekB(parsed);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const doImport = async () => {
    setErr('');

    if (!weekA) {
      setErr('Please upload Week A first');
      return;
    }

    if (!weekB) {
      setErr('Please upload Week B first');
      return;
    }

    setSaving(true);

    try {
      await onImport(weekA, weekB);
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const bg = dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${bg}`}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold font-mono text-gray-900 dark:text-white">
            import timetable
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          export each week from sentral as a separate{' '}
          <strong className="text-gray-700 dark:text-gray-300">.ics</strong> file and upload below.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <UploadZone week="A" data={weekA} dark={dark} onFile={handleFile} />
          <UploadZone week="B" data={weekB} dark={dark} onFile={handleFile} />
        </div>

        {err && (
          <p className="text-xs font-mono text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 mb-3">
            {err}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-mono font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            cancel
          </button>

          <motion.button
            onClick={doImport}
            disabled={saving || !weekA || !weekB}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-mono font-medium text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'importing…' : 'import both weeks'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
