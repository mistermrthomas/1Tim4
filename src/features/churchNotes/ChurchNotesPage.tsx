import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { startOfWeekSunday, toLocalDateKey } from '../../domain/calendar/week';
import {
  CHURCH_NOTES_FIXTURE_META,
  CHURCH_NOTES_FIXTURE_RAW,
} from '../../domain/churchNotes/fixture';
import {
  buildWeeklyFormationPlan,
  createDraftSermonNote,
  mondayAfterSermon,
} from '../../domain/churchNotes/planFromAnalysis';
import {
  getAnalysisForNote,
  getSermonNote,
  saveSermonAnalysis,
  saveSermonNote,
  saveWeeklyFormationPlan,
} from '../../domain/churchNotes/store';
import type { SermonAnalysis, SermonNote } from '../../domain/churchNotes/types';
import { newId } from '../../domain/physical/store';
import { activateAndSyncWeeklyPlan } from '../../domain/weeklyPlan/activate';
import { applyBiblicalDefaultsFromChurch } from '../../domain/weeklyPlan/factory';
import { ensureWeeklyPlan } from '../../domain/weeklyPlan/store';
import { useAuth } from '../../context/AuthContext';
import { scheduleFormationStatePush } from '../../services/cloudFormationSync';
import {
  emptyStructuredAnalysis,
  type StructuredChurchAnalysis,
} from '../../../shared/churchNotesAnalysis';
import { analyzeChurchNotes, ChurchNotesAiError } from '../../services/churchNotesAi';
import { Button } from '../../ui/Button';
import './ChurchNotesPage.css';

type Step = 'capture' | 'analyzing' | 'review' | 'plan';

const RELEVANT_PERSONAL_CONTEXT = [
  'The user can substitute planning, building systems, and other useful activities for direct spiritual practice.',
  'The user wants the app to direct him toward Scripture and then get out of the way.',
];

const REVIEW_SECTIONS: Array<{
  key: string;
  title: string;
  flag?: boolean;
}> = [
  { key: 'sermonSummary', title: 'Sermon Summary' },
  { key: 'centralMessage', title: 'Central Message' },
  { key: 'scripturePassages', title: 'Key Scripture Passages' },
  { key: 'teachingPoints', title: 'Main Teaching Points' },
  { key: 'illustrations', title: 'Important Illustrations' },
  { key: 'personalQuestions', title: 'Personal Questions Raised' },
  { key: 'possibleBait', title: 'Possible Spiritual “Bait” or Vulnerabilities', flag: true },
  { key: 'weeklyTheme', title: 'Weekly Formation Theme' },
  { key: 'memoryVerse', title: 'Weekly Memory Verse' },
  { key: 'practicalResponse', title: 'Practical Response' },
  { key: 'prayerFocus', title: 'Prayer Focus' },
  { key: 'announcements', title: 'Church Announcements and Dates' },
  { key: 'clarificationsNeeded', title: 'Items That Need Clarification', flag: true },
  { key: 'sevenDayPlan', title: 'Seven-Day Formation Plan' },
];

function cloneAnalysis(a: StructuredChurchAnalysis): StructuredChurchAnalysis {
  return structuredClone(a);
}

function linesToText(lines: string[]): string {
  return lines.join('\n');
}

function textToLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function ChurchNotesPage() {
  const { noteId: noteIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const userId = user?.id ?? 'local';

  const pushCloudIfSignedIn = useCallback(() => {
    if (user?.id) scheduleFormationStatePush(user.id);
  }, [user?.id]);

  const [step, setStep] = useState<Step>('capture');
  const [note, setNote] = useState<SermonNote | null>(null);
  const [analysisRecord, setAnalysisRecord] = useState<SermonAnalysis | null>(null);
  const [edited, setEdited] = useState<StructuredChurchAnalysis>(emptyStructuredAnalysis());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sermonSummary: true,
    clarificationsNeeded: true,
  });
  const [planStartDate, setPlanStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const inflightRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const loadOrCreate = useCallback(async () => {
    try {
      if (noteIdParam) {
        const existing = await getSermonNote(noteIdParam);
        if (!existing) {
          setError('Church note not found');
          return;
        }
        setNote(existing);
        const analysis = await getAnalysisForNote(existing.id);
        if (analysis) {
          setAnalysisRecord(analysis);
          setEdited(cloneAnalysis(analysis.userEditedAnalysis));
          setPlanStartDate(mondayAfterSermon(existing.sermonDate));
          if (existing.status === 'analyzed' || existing.status === 'approved') {
            setStep('review');
          }
        }
        return;
      }

      const useFixture = searchParams.get('fixture') === '1';
      const draft = createDraftSermonNote(userId, toLocalDateKey(), {
        title: useFixture ? CHURCH_NOTES_FIXTURE_META.title : '',
        primaryScripture: useFixture ? CHURCH_NOTES_FIXTURE_META.primaryScripture : '',
        sermonDate: useFixture ? CHURCH_NOTES_FIXTURE_META.sermonDate : toLocalDateKey(),
        announcementsNotes: useFixture ? CHURCH_NOTES_FIXTURE_META.announcementsNotes : '',
        rawNotes: useFixture ? CHURCH_NOTES_FIXTURE_RAW : '',
      });
      const saved = await saveSermonNote(draft);
      setNote(saved);
      setPlanStartDate(mondayAfterSermon(saved.sermonDate));
      navigate(`/church-notes/${saved.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [navigate, noteIdParam, searchParams, userId]);

  useEffect(() => {
    void loadOrCreate();
  }, [loadOrCreate]);

  const patchNote = (updater: (prev: SermonNote) => SermonNote) => {
    setNote((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void (async () => {
          try {
            const saved = await saveSermonNote(next);
            setNote(saved);
            setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
            if (user?.id) scheduleFormationStatePush(user.id);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        })();
      }, 650);
      return next;
    });
    setError(null);
  };

  const saveDraft = async () => {
    if (!note) return;
    setSaving(true);
    try {
      const saved = await saveSermonNote(note);
      setNote(saved);
      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const runAnalysis = async () => {
    if (!note || !note.rawNotes.trim()) {
      setError('Add some raw notes before analyzing.');
      return;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;
    setAnalyzing(true);
    setError(null);
    setStep('analyzing');

    const rawSnapshot = note.rawNotes;
    const requestId = newId('cnreq');
    requestIdRef.current = requestId;

    try {
      await saveSermonNote(note);

      const result = await analyzeChurchNotes(
        {
          sermonDate: note.sermonDate,
          sermonTitle: note.title || null,
          speaker: note.speaker || null,
          church: note.church || null,
          series: note.series || null,
          primaryScripture: note.primaryScripture || null,
          rawNotes: note.rawNotes,
          sourceLinks: note.sourceLinks || null,
          announcementsNotes: note.announcementsNotes || null,
          currentReadingPlan: {
            book: 'Acts',
            cadence: 'one chapter per day',
            currentChapter: 1,
          },
          relevantPersonalContext: RELEVANT_PERSONAL_CONTEXT,
          requestId,
        },
        { accessToken: session?.access_token },
      );

      // Preserve original raw notes explicitly
      const preserved = await saveSermonNote({
        ...note,
        rawNotes: rawSnapshot,
        status: 'analyzed',
      });
      setNote(preserved);

      const record: SermonAnalysis = {
        id: newId('sanal'),
        sermonNoteId: preserved.id,
        model: result.model,
        promptVersion: result.promptVersion,
        structuredAnalysis: cloneAnalysis(result.analysis),
        userEditedAnalysis: cloneAnalysis(result.analysis),
        generatedAt: new Date().toISOString(),
        approvedAt: null,
      };
      await saveSermonAnalysis(record);
      setAnalysisRecord(record);
      setEdited(cloneAnalysis(result.analysis));
      setPlanStartDate(mondayAfterSermon(preserved.sermonDate));
      setStep('review');
    } catch (e) {
      // Restore capture step; raw notes untouched
      setNote((prev) => (prev ? { ...prev, rawNotes: rawSnapshot } : prev));
      setStep('capture');
      if (e instanceof ChurchNotesAiError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Analysis failed');
      }
    } finally {
      inflightRef.current = false;
      setAnalyzing(false);
      requestIdRef.current = null;
    }
  };

  const persistEdits = async () => {
    if (!analysisRecord) return analysisRecord;
    const next: SermonAnalysis = {
      ...analysisRecord,
      userEditedAnalysis: cloneAnalysis(edited),
    };
    await saveSermonAnalysis(next);
    setAnalysisRecord(next);
    return next;
  };

  const saveReviewOnly = async () => {
    if (!note || !analysisRecord) return;
    setSaving(true);
    try {
      await persistEdits();
      const saved = await saveSermonNote({ ...note, status: 'analyzed' });
      setNote(saved);
      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const approveAndCreatePlan = async () => {
    if (!note || !analysisRecord) return;
    setSaving(true);
    setError(null);
    try {
      const analysis = await persistEdits();
      if (!analysis) return;

      const start = planStartDate || mondayAfterSermon(note.sermonDate);
      const formation = buildWeeklyFormationPlan({
        userId,
        sermonNote: note,
        analysis,
        edited,
        startDate: start,
      });
      await saveWeeklyFormationPlan(formation);

      const approvedAnalysis: SermonAnalysis = {
        ...analysis,
        userEditedAnalysis: cloneAnalysis(edited),
        approvedAt: new Date().toISOString(),
      };
      await saveSermonAnalysis(approvedAnalysis);
      setAnalysisRecord(approvedAnalysis);

      const approvedNote = await saveSermonNote({ ...note, status: 'approved' });
      setNote(approvedNote);

      // Layer onto this Sunday–Saturday weekly plan and activate it for Today
      const sunday = startOfWeekSunday(new Date(`${start}T12:00:00`));
      const weekly = await ensureWeeklyPlan(sunday);
      const formationByDate = new Map(formation.dailyPlan.map((d) => [d.date, d]));
      const layered = applyBiblicalDefaultsFromChurch({
        ...weekly,
        church: {
          ...weekly.church,
          sermonDate: approvedNote.sermonDate,
          sermonTitle: approvedNote.title,
          speaker: approvedNote.speaker,
          churchOrSeries: approvedNote.church || approvedNote.series,
          primaryScripture: approvedNote.primaryScripture || edited.memoryVerse.reference,
          sermonNotes: approvedNote.rawNotes,
          sermonUrl: approvedNote.sourceLinks,
          stoodOutMost: edited.centralMessage,
          whyItStoodOut: edited.weeklyTheme,
          behaviorChange: edited.practicalResponse[0] || weekly.church.behaviorChange,
          additionalContext: '',
          uncertainty: edited.clarificationsNeeded.join('; '),
        },
        biblical: {
          ...weekly.biblical,
          sermonSummary: edited.sermonSummary,
          centralPrinciple: edited.centralMessage,
          weeklyTheme: edited.weeklyTheme,
          weeklyPractice: edited.practicalResponse[0] || weekly.biblical.weeklyPractice,
          coreScripture: edited.memoryVerse.reference || weekly.biblical.coreScripture,
          supportingScriptures: edited.scripturePassages.map((p) => p.reference),
          days: weekly.biblical.days.map((day) => {
            const formDay = formationByDate.get(day.date);
            return {
              ...day,
              focus: formDay?.theme || edited.weeklyTheme || day.focus,
              scripture: edited.memoryVerse.reference || day.scripture,
              practice: edited.practicalResponse[0] || day.practice,
              morningPrompt: formDay?.beforeReadingPrompt || day.morningPrompt,
              eveningPrompt: formDay?.reflectionQuestion || day.eveningPrompt,
              prayer: formDay?.prayerPrompt || day.prayer,
              teaching: edited.centralMessage || day.teaching,
            };
          }),
          sourceNotes:
            'Approved from Church Notes AI review. Raw notes preserved separately. Layered onto — not replacing — any reading plan.',
          approved: true,
        },
      });
      await activateAndSyncWeeklyPlan(layered);
      pushCloudIfSignedIn();

      setStep('plan');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const previewDays = useMemo(() => edited.sevenDayPlan, [edited.sevenDayPlan]);

  if (error && !note) {
    return <p className="church-notes__error">{error}</p>;
  }
  if (!note) {
    return <p className="church-notes__note">Loading church notes…</p>;
  }

  return (
    <div className="church-notes path-fade-in">
      <header className="church-notes__hero">
        <p className="path-eyebrow">Sermon journal</p>
        <h1 className="path-display church-notes__title">Church Notes</h1>
        <p className="path-body church-notes__lede">
          Capture messy notes now. Review AI structure later. Keep Scripture, prayer, and church
          primary — this app should get out of the way.
        </p>
      </header>

      <div className="church-notes__toolbar">
        <Link className="path-btn path-btn--ghost" to="/today">
          Back to Today
        </Link>
        {savedAt ? (
          <p className="church-notes__status church-notes__status--saved">Saved {savedAt}</p>
        ) : (
          <p className="church-notes__status">Draft autosaves as you type</p>
        )}
      </div>

      {error ? <p className="church-notes__error">{error}</p> : null}

      {step === 'capture' && (
        <section className="church-notes__section path-surface">
          <h2 className="church-notes__h2">1. Capture raw notes</h2>
          <p className="church-notes__note">
            Shorthand, duplicates, questions, and links are fine. Original notes are never altered
            by AI.
          </p>
          <div className="church-notes__grid">
            <label className="path-field">
              <span>Sermon date</span>
              <input
                type="date"
                value={note.sermonDate}
                onChange={(e) =>
                  patchNote((n) => ({
                    ...n,
                    sermonDate: e.target.value,
                  }))
                }
              />
            </label>
            <label className="path-field">
              <span>Church or campus</span>
              <input
                value={note.church}
                onChange={(e) => patchNote((n) => ({ ...n, church: e.target.value }))}
              />
            </label>
            <label className="path-field">
              <span>Pastor or speaker</span>
              <input
                value={note.speaker}
                onChange={(e) => patchNote((n) => ({ ...n, speaker: e.target.value }))}
              />
            </label>
            <label className="path-field">
              <span>Sermon title</span>
              <input
                value={note.title}
                onChange={(e) => patchNote((n) => ({ ...n, title: e.target.value }))}
              />
            </label>
            <label className="path-field">
              <span>Series</span>
              <input
                value={note.series}
                onChange={(e) => patchNote((n) => ({ ...n, series: e.target.value }))}
              />
            </label>
            <label className="path-field">
              <span>Main Scripture passages</span>
              <input
                value={note.primaryScripture}
                onChange={(e) => patchNote((n) => ({ ...n, primaryScripture: e.target.value }))}
              />
            </label>
            <label className="path-field church-notes__span-2">
              <span>Raw notes</span>
              <textarea
                className="church-notes__raw"
                rows={12}
                placeholder="Paste or type what you heard…"
                value={note.rawNotes}
                onChange={(e) => patchNote((n) => ({ ...n, rawNotes: e.target.value }))}
              />
            </label>
            <label className="path-field church-notes__span-2">
              <span>Relevant church links</span>
              <input
                value={note.sourceLinks}
                onChange={(e) => patchNote((n) => ({ ...n, sourceLinks: e.target.value }))}
              />
            </label>
            <label className="path-field church-notes__span-2">
              <span>Upcoming dates or announcements</span>
              <textarea
                rows={3}
                value={note.announcementsNotes}
                onChange={(e) => patchNote((n) => ({ ...n, announcementsNotes: e.target.value }))}
              />
            </label>
          </div>
          <div className="church-notes__actions">
            <Button onClick={() => void runAnalysis()} disabled={analyzing || saving}>
              Analyze Notes with AI
            </Button>
            <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving}>
              Save Draft
            </Button>
            <Link className="path-btn path-btn--ghost" to="/today">
              Cancel
            </Link>
          </div>
        </section>
      )}

      {step === 'analyzing' && (
        <section className="church-notes__section path-surface">
          <div className="church-notes__loading">
            <div className="church-notes__loading-pulse" aria-hidden />
            <h2 className="church-notes__h2">Analyzing</h2>
            <p className="path-body">
              Organizing your notes and identifying the central spiritual themes…
            </p>
            <p className="church-notes__note">Your raw notes stay exactly as you wrote them.</p>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="church-notes__section path-surface">
          <h2 className="church-notes__h2">2. Review AI results</h2>
          <p className="church-notes__notice">
            AI organized these notes based only on what you entered. Review the results before
            saving, especially interpretations, Scripture references, and personal application.
          </p>

          <div className="church-notes__raw-panel">
            <p className="church-notes__note">Original raw notes (read-only)</p>
            <pre>{note.rawNotes}</pre>
          </div>

          <div className="church-notes__accordion">
            {REVIEW_SECTIONS.map((section) => {
              const open = Boolean(openSections[section.key]);
              return (
                <div
                  key={section.key}
                  className={`church-notes__acc-item${section.flag ? ' church-notes__acc-item--flag' : ''}`}
                >
                  <button
                    type="button"
                    className="church-notes__acc-btn"
                    aria-expanded={open}
                    onClick={() => toggleSection(section.key)}
                  >
                    <span>{section.title}</span>
                    <span aria-hidden>{open ? '−' : '+'}</span>
                  </button>
                  {open ? (
                    <div className="church-notes__acc-body">
                      {renderEditableSection(section.key, edited, setEdited)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="church-notes__preview">
            <h3>Weekly plan preview</h3>
            <p className="path-body">{edited.weeklyTheme || '—'}</p>
            <p className="church-notes__note">
              Memory verse: {edited.memoryVerse.reference || '—'}
            </p>
            <label className="path-field">
              <span>Plan start date (default: Monday after sermon)</span>
              <input
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
              />
            </label>
            <ul>
              {previewDays.map((d) => (
                <li key={d.dayNumber}>
                  Day {d.dayNumber}: {d.theme || '—'}
                </li>
              ))}
            </ul>
          </div>

          <div className="church-notes__actions">
            <Button onClick={() => void approveAndCreatePlan()} disabled={saving}>
              Approve and Create Weekly Plan
            </Button>
            <Button variant="ghost" onClick={() => void saveReviewOnly()} disabled={saving}>
              Save as Sermon Review Only
            </Button>
            <Button variant="ghost" onClick={() => void runAnalysis()} disabled={analyzing}>
              Regenerate
            </Button>
            <Button variant="ghost" onClick={() => setStep('capture')}>
              Return to Raw Notes
            </Button>
          </div>
        </section>
      )}

      {step === 'plan' && (
        <section className="church-notes__section path-surface">
          <h2 className="church-notes__h2">3. Weekly formation plan</h2>
          <p className="church-notes__notice">
            Your seven-day formation layer is active for Today. It does not replace your
            Bible-reading plan — Today will show reading (if any) alongside this week’s theme and one
            framing question.
          </p>
          <p className="path-body">{edited.weeklyTheme}</p>
          <p className="church-notes__note">
            {planStartDate} → memory verse {edited.memoryVerse.reference}
          </p>
          <div className="church-notes__actions">
            <Link className="path-btn path-btn--primary" to="/today">
              Go to Today
            </Link>
            <Button variant="ghost" onClick={() => setStep('review')}>
              Edit review
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function renderEditableSection(
  key: string,
  edited: StructuredChurchAnalysis,
  setEdited: Dispatch<SetStateAction<StructuredChurchAnalysis>>,
) {
  switch (key) {
    case 'sermonSummary':
      return (
        <label className="path-field">
          <span>Summary</span>
          <textarea
            rows={4}
            value={edited.sermonSummary}
            onChange={(e) => setEdited((a) => ({ ...a, sermonSummary: e.target.value }))}
          />
        </label>
      );
    case 'centralMessage':
      return (
        <label className="path-field">
          <span>Central message</span>
          <textarea
            rows={3}
            value={edited.centralMessage}
            onChange={(e) => setEdited((a) => ({ ...a, centralMessage: e.target.value }))}
          />
        </label>
      );
    case 'weeklyTheme':
      return (
        <label className="path-field">
          <span>Theme</span>
          <input
            value={edited.weeklyTheme}
            onChange={(e) => setEdited((a) => ({ ...a, weeklyTheme: e.target.value }))}
          />
        </label>
      );
    case 'memoryVerse':
      return (
        <>
          <label className="path-field">
            <span>Reference</span>
            <input
              value={edited.memoryVerse.reference}
              onChange={(e) =>
                setEdited((a) => ({
                  ...a,
                  memoryVerse: { ...a.memoryVerse, reference: e.target.value },
                }))
              }
            />
          </label>
          <label className="path-field">
            <span>Reason</span>
            <textarea
              rows={2}
              value={edited.memoryVerse.reason}
              onChange={(e) =>
                setEdited((a) => ({
                  ...a,
                  memoryVerse: { ...a.memoryVerse, reason: e.target.value },
                }))
              }
            />
          </label>
        </>
      );
    case 'scripturePassages':
      return (
        <>
          {edited.scripturePassages.map((p, i) => (
            <div key={`${p.reference}-${i}`} className="church-notes__grid">
              <label className="path-field">
                <span>Reference</span>
                <input
                  value={p.reference}
                  onChange={(e) =>
                    setEdited((a) => {
                      const scripturePassages = [...a.scripturePassages];
                      scripturePassages[i] = { ...p, reference: e.target.value };
                      return { ...a, scripturePassages };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Confidence</span>
                <select
                  value={p.confidence}
                  onChange={(e) =>
                    setEdited((a) => {
                      const scripturePassages = [...a.scripturePassages];
                      scripturePassages[i] = {
                        ...p,
                        confidence: e.target.value as typeof p.confidence,
                      };
                      return { ...a, scripturePassages };
                    })
                  }
                >
                  <option value="explicit">explicit</option>
                  <option value="inferred">inferred</option>
                  <option value="uncertain">uncertain</option>
                </select>
              </label>
              <label className="path-field church-notes__span-2">
                <span>Context from notes</span>
                <textarea
                  rows={2}
                  value={p.contextFromNotes}
                  onChange={(e) =>
                    setEdited((a) => {
                      const scripturePassages = [...a.scripturePassages];
                      scripturePassages[i] = { ...p, contextFromNotes: e.target.value };
                      return { ...a, scripturePassages };
                    })
                  }
                />
              </label>
              {p.confidence !== 'explicit' ? (
                <div className="church-notes__chip-row church-notes__span-2">
                  <span className="church-notes__chip church-notes__chip--uncertain">
                    Needs review
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </>
      );
    case 'teachingPoints':
      return (
        <>
          {edited.teachingPoints.map((t, i) => (
            <div key={`${t.title}-${i}`}>
              <label className="path-field">
                <span>Title</span>
                <input
                  value={t.title}
                  onChange={(e) =>
                    setEdited((a) => {
                      const teachingPoints = [...a.teachingPoints];
                      teachingPoints[i] = { ...t, title: e.target.value };
                      return { ...a, teachingPoints };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Explanation</span>
                <textarea
                  rows={2}
                  value={t.explanation}
                  onChange={(e) =>
                    setEdited((a) => {
                      const teachingPoints = [...a.teachingPoints];
                      teachingPoints[i] = { ...t, explanation: e.target.value };
                      return { ...a, teachingPoints };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Supporting notes (one per line)</span>
                <textarea
                  rows={2}
                  value={linesToText(t.supportingNotes)}
                  onChange={(e) =>
                    setEdited((a) => {
                      const teachingPoints = [...a.teachingPoints];
                      teachingPoints[i] = { ...t, supportingNotes: textToLines(e.target.value) };
                      return { ...a, teachingPoints };
                    })
                  }
                />
              </label>
            </div>
          ))}
        </>
      );
    case 'illustrations':
      return (
        <>
          {edited.illustrations.map((ill, i) => (
            <div key={`${ill.name}-${i}`}>
              <label className="path-field">
                <span>Name</span>
                <input
                  value={ill.name}
                  onChange={(e) =>
                    setEdited((a) => {
                      const illustrations = [...a.illustrations];
                      illustrations[i] = { ...ill, name: e.target.value };
                      return { ...a, illustrations };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Meaning</span>
                <textarea
                  rows={2}
                  value={ill.meaning}
                  onChange={(e) =>
                    setEdited((a) => {
                      const illustrations = [...a.illustrations];
                      illustrations[i] = { ...ill, meaning: e.target.value };
                      return { ...a, illustrations };
                    })
                  }
                />
              </label>
            </div>
          ))}
        </>
      );
    case 'personalQuestions':
    case 'practicalResponse':
    case 'prayerFocus':
    case 'clarificationsNeeded':
      return (
        <label className="path-field">
          <span>One item per line</span>
          <textarea
            rows={4}
            value={linesToText(edited[key])}
            onChange={(e) =>
              setEdited((a) => ({
                ...a,
                [key]: textToLines(e.target.value),
              }))
            }
          />
        </label>
      );
    case 'possibleBait':
      return (
        <>
          {edited.possibleBait.map((b, i) => (
            <div key={`${b.bait}-${i}`}>
              <label className="path-field">
                <span>Bait</span>
                <input
                  value={b.bait}
                  onChange={(e) =>
                    setEdited((a) => {
                      const possibleBait = [...a.possibleBait];
                      possibleBait[i] = { ...b, bait: e.target.value };
                      return { ...a, possibleBait };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Why it may be relevant</span>
                <textarea
                  rows={2}
                  value={b.whyItMayBeRelevant}
                  onChange={(e) =>
                    setEdited((a) => {
                      const possibleBait = [...a.possibleBait];
                      possibleBait[i] = { ...b, whyItMayBeRelevant: e.target.value };
                      return { ...a, possibleBait };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Evidence from notes</span>
                <textarea
                  rows={2}
                  value={b.evidenceFromNotes}
                  onChange={(e) =>
                    setEdited((a) => {
                      const possibleBait = [...a.possibleBait];
                      possibleBait[i] = { ...b, evidenceFromNotes: e.target.value };
                      return { ...a, possibleBait };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Certainty</span>
                <select
                  value={b.certainty}
                  onChange={(e) =>
                    setEdited((a) => {
                      const possibleBait = [...a.possibleBait];
                      possibleBait[i] = {
                        ...b,
                        certainty: e.target.value as typeof b.certainty,
                      };
                      return { ...a, possibleBait };
                    })
                  }
                >
                  <option value="possible">possible</option>
                  <option value="likely">likely</option>
                </select>
              </label>
            </div>
          ))}
        </>
      );
    case 'announcements':
      return (
        <>
          {edited.announcements.map((ann, i) => (
            <div key={`${ann.title}-${i}`} className="church-notes__grid">
              <label className="path-field">
                <span>Title</span>
                <input
                  value={ann.title}
                  onChange={(e) =>
                    setEdited((a) => {
                      const announcements = [...a.announcements];
                      announcements[i] = { ...ann, title: e.target.value };
                      return { ...a, announcements };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Date</span>
                <input
                  value={ann.date ?? ''}
                  onChange={(e) =>
                    setEdited((a) => {
                      const announcements = [...a.announcements];
                      announcements[i] = { ...ann, date: e.target.value || null };
                      return { ...a, announcements };
                    })
                  }
                />
              </label>
              <label className="path-field church-notes__span-2">
                <span>Details</span>
                <textarea
                  rows={2}
                  value={ann.details}
                  onChange={(e) =>
                    setEdited((a) => {
                      const announcements = [...a.announcements];
                      announcements[i] = { ...ann, details: e.target.value };
                      return { ...a, announcements };
                    })
                  }
                />
              </label>
            </div>
          ))}
        </>
      );
    case 'sevenDayPlan':
      return (
        <>
          {edited.sevenDayPlan.map((day, i) => (
            <div key={day.dayNumber}>
              <p className="church-notes__note">Day {day.dayNumber}</p>
              <label className="path-field">
                <span>Theme</span>
                <input
                  value={day.theme}
                  onChange={(e) =>
                    setEdited((a) => {
                      const sevenDayPlan = [...a.sevenDayPlan];
                      sevenDayPlan[i] = { ...day, theme: e.target.value };
                      return { ...a, sevenDayPlan };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Before reading</span>
                <textarea
                  rows={2}
                  value={day.beforeReadingPrompt}
                  onChange={(e) =>
                    setEdited((a) => {
                      const sevenDayPlan = [...a.sevenDayPlan];
                      sevenDayPlan[i] = { ...day, beforeReadingPrompt: e.target.value };
                      return { ...a, sevenDayPlan };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Reflection question</span>
                <textarea
                  rows={2}
                  value={day.reflectionQuestion}
                  onChange={(e) =>
                    setEdited((a) => {
                      const sevenDayPlan = [...a.sevenDayPlan];
                      sevenDayPlan[i] = { ...day, reflectionQuestion: e.target.value };
                      return { ...a, sevenDayPlan };
                    })
                  }
                />
              </label>
              <label className="path-field">
                <span>Prayer prompt</span>
                <textarea
                  rows={2}
                  value={day.prayerPrompt}
                  onChange={(e) =>
                    setEdited((a) => {
                      const sevenDayPlan = [...a.sevenDayPlan];
                      sevenDayPlan[i] = { ...day, prayerPrompt: e.target.value };
                      return { ...a, sevenDayPlan };
                    })
                  }
                />
              </label>
            </div>
          ))}
        </>
      );
    default:
      return null;
  }
}
