import { useReducer } from 'react'
import copy from '../docs/page-content.json'
import {
  canJumpToScreen,
  generateRewrite,
  nextInterrogationTurn,
  readIntakeFile,
  runFileIntakeStep,
  runIntakeStep,
  runMockDemoIntake,
  scaffoldDraft,
  type FileIntakeResult,
  type IntakeResult,
} from './lib/actions.ts'
import type {
  AgentState,
  Draft,
  InterrogationSession,
  Profile,
  RewriteResult,
  SearchCriteriaResult,
  ScoreFitResult,
} from './lib/contracts.ts'
import { createInitialAgentState, updateAgentState } from './lib/memory/state.ts'
import './App.css'

type Screen = 0 | 1 | 2 | 3 | 4
type Busy = 'idle' | 'intake' | 'draft' | 'interrogation' | 'rewrite'
type Lang = 'vi' | 'en'
type Bilingual = { vi: string; en: string }

type Message = {
  role: 'agent' | 'user'
  label?: string
  text: string
  sources?: string[]
  tone?: 'warning' | 'success'
}

type State = {
  screen: Screen
  agentState: AgentState
  messages: Message[]
  intakeInput: string
  search: SearchCriteriaResult | null
  fit: ScoreFitResult | null
  draftText: string
  draft: Draft | null
  session: InterrogationSession | null
  rewrite: RewriteResult | null
  answerInput: string
  ttsOn: boolean
  lang: Lang
  busy: Busy
  error: string
}

type Action =
  | { type: 'jump'; screen: Screen }
  | { type: 'back' }
  | { type: 'setIntakeInput'; value: string }
  | { type: 'startIntake'; message: string }
  | { type: 'finishIntake'; result: IntakeResult }
  | { type: 'startFileIntake'; fileName: string }
  | { type: 'finishFileIntake'; result: FileIntakeResult }
  | { type: 'startMockIntake' }
  | { type: 'finishMockIntake'; result: IntakeResult }
  | { type: 'setDraftText'; value: string }
  | { type: 'startDraft' }
  | { type: 'finishDraft'; draft: Draft }
  | { type: 'setAnswerInput'; value: string }
  | { type: 'startInterrogation'; draft: Draft }
  | { type: 'finishInterrogation'; session: InterrogationSession; done: boolean }
  | { type: 'startRewrite' }
  | { type: 'finishRewrite'; rewrite: RewriteResult }
  | { type: 'toggleTts' }
  | { type: 'setLang'; lang: Lang }
  | { type: 'clearError' }
  | { type: 'error'; message: string }

const content = copy as typeof copy
const steps = content.global.stepper

function t(value: Bilingual, lang: Lang) {
  return value[lang]
}

function seedMessage(lang: Lang): Message {
  const seed = content.scr01_intake.messages[0]
  const text =
    typeof seed.text === 'string' ? seed.text : t(seed.text as Bilingual, lang)
  return { role: seed.role as Message['role'], label: seed.label, text }
}

function mockDemoMessages(lang: Lang): Message[] {
  return content.scr01_intake.messages.map((entry) => ({
    role: entry.role as Message['role'],
    label: entry.label,
    text: typeof entry.text === 'string' ? entry.text : t(entry.text as Bilingual, lang),
    sources: entry.sources,
  }))
}

const initialState: State = {
  screen: 0,
  agentState: createInitialAgentState(),
  messages: [seedMessage('vi')],
  intakeInput: '',
  search: null,
  fit: null,
  draftText: '',
  draft: null,
  session: null,
  rewrite: null,
  answerInput: '',
  ttsOn: true,
  lang: 'vi',
  busy: 'idle',
  error: '',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'jump':
      if (!canJumpToScreen(action.screen, state.agentState)) {
        return { ...state, error: t(content.states.insufficientData, state.lang) }
      }
      return { ...state, screen: action.screen, error: '' }
    case 'back':
      return { ...state, screen: Math.max(0, state.screen - 1) as Screen, error: '' }
    case 'setIntakeInput':
      return { ...state, intakeInput: action.value, error: '' }
    case 'startIntake':
      return {
        ...state,
        busy: 'intake',
        intakeInput: '',
        error: '',
        messages: [...state.messages, { role: 'user', text: action.message }],
      }
    case 'finishIntake': {
      const { result } = action
      return {
        ...state,
        busy: 'idle',
        agentState: result.state,
        search: result.search,
        fit: result.fit,
        messages: [
          ...state.messages,
          {
            role: 'agent',
            label: 'SoPilot',
            text:
              result.userFacing ??
              (result.step.action.type === 'finish' ? result.step.action.shortlistSummary : ''),
            sources: result.search.sources.map((source) => source.url),
          },
        ],
      }
    }
    case 'startFileIntake':
      return {
        ...state,
        busy: 'intake',
        error: '',
        messages: [...state.messages, { role: 'user', text: `📎 ${action.fileName}` }],
      }
    case 'finishFileIntake': {
      const { result } = action
      const prefix =
        result.status === 'out_of_scope'
          ? t(content.scr01_intake.upload.outOfScopePrefix, state.lang)
          : t(content.scr01_intake.upload.validPrefix, state.lang)
      const agentMessage = {
        role: 'agent' as const,
        label: 'SoPilot',
        text: `${prefix}: ${result.userFacing ?? ''}`,
        tone: (result.status === 'out_of_scope' ? 'warning' : 'success') as 'warning' | 'success',
        sources:
          result.status === 'valid'
            ? result.search.sources.map((source) => source.url)
            : undefined,
      }

      if (result.status === 'out_of_scope') {
        return {
          ...state,
          busy: 'idle',
          messages: [...state.messages, agentMessage],
        }
      }

      return {
        ...state,
        busy: 'idle',
        agentState: result.state,
        search: result.search,
        fit: result.fit,
        messages: [...state.messages, agentMessage],
      }
    }
    case 'startMockIntake':
      return { ...state, busy: 'intake', error: '' }
    case 'finishMockIntake': {
      const { result } = action
      return {
        ...state,
        busy: 'idle',
        agentState: result.state,
        search: result.search,
        fit: result.fit,
        messages: mockDemoMessages(state.lang),
      }
    }
    case 'setDraftText':
      return { ...state, draftText: action.value, error: '' }
    case 'startDraft':
      return { ...state, busy: 'draft', error: '' }
    case 'finishDraft':
      return {
        ...state,
        busy: 'idle',
        draft: action.draft,
        draftText: action.draft.body,
        agentState: updateAgentState(state.agentState, { draft: action.draft }),
      }
    case 'setAnswerInput':
      return { ...state, answerInput: action.value, error: '' }
    case 'startInterrogation':
      return {
        ...state,
        busy: 'interrogation',
        error: '',
        draft: action.draft,
        draftText: action.draft.body,
        agentState: updateAgentState(state.agentState, { draft: action.draft }),
      }
    case 'finishInterrogation':
      return {
        ...state,
        busy: 'idle',
        screen: 3,
        answerInput: '',
        session: action.session,
        agentState: updateAgentState(state.agentState, { session: action.session }),
      }
    case 'startRewrite':
      return { ...state, busy: 'rewrite', error: '', screen: 4 }
    case 'finishRewrite':
      return { ...state, busy: 'idle', rewrite: action.rewrite }
    case 'toggleTts':
      return { ...state, ttsOn: !state.ttsOn }
    case 'setLang': {
      const isSeedOnly =
        state.messages.length === 1 && state.messages[0]?.role === 'agent'
      const isMockDemo =
        state.messages.length === content.scr01_intake.messages.length &&
        state.fit !== null
      const messages = isMockDemo
        ? mockDemoMessages(action.lang)
        : isSeedOnly
          ? [seedMessage(action.lang)]
          : state.messages
      return { ...state, lang: action.lang, messages }
    }
    case 'clearError':
      return { ...state, error: '' }
    case 'error':
      return { ...state, busy: 'idle', error: action.message }
    default:
      return state
  }
}

function FitBand({ band, lang }: { band: ScoreFitResult['band']; lang: Lang }) {
  const label =
    band === 'strong_match'
      ? content.fitBands.strong_match
      : band === 'competitive'
        ? content.fitBands.competitive
        : band === 'reach'
          ? content.fitBands.reach
          : content.fitBands.insufficient_data
  const key = band === 'strong_match' ? 'strongMatch' : band

  return (
    <span className={`fit-band fit-${key}`}>
      <span />
      {t(label, lang)}
    </span>
  )
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function Button({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  type = 'button',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'text' | 'dark'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      className={`button button-${variant}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  )
}

function Card({
  children,
  dark = false,
  className = '',
}: {
  children: React.ReactNode
  dark?: boolean
  className?: string
}) {
  return <section className={`card ${dark ? 'card-dark' : ''} ${className}`}>{children}</section>
}

function SourceChip({ label, prefix }: { label: string; prefix?: string }) {
  const text = prefix ? `${prefix} · ${shortSource(label)}` : shortSource(label)
  return label.startsWith('http') ? (
    <a className="source-chip" href={label} rel="noreferrer" target="_blank">
      <span />
      {text}
    </a>
  ) : (
    <span className="source-chip">
      <span />
      {text}
    </span>
  )
}

function shortSource(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function CriteriaRow({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="criteria-row">
      <span className={met ? 'criteria-mark met' : 'criteria-mark unmet'}>{met ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  )
}

function TypingDots({ lang }: { lang: Lang }) {
  return (
    <span className="typing-dots" aria-label={t(content.states.loading, lang)}>
      <span />
      <span />
      <span />
    </span>
  )
}

function Stepper({
  screen,
  dispatch,
  lang,
}: {
  screen: Screen
  dispatch: React.Dispatch<Action>
  lang: Lang
}) {
  return (
    <div className="stepper" aria-label={lang === 'vi' ? 'Hành trình' : 'Journey'}>
      <div className="stepper-track">
        <span className="stepper-fill" style={{ width: `${(screen / 4) * 88}%` }} />
      </div>
      {steps.map((step, index) => {
        const state = index < screen ? 'done' : index === screen ? 'current' : 'upcoming'
        return (
          <button
            className={`stepper-stop ${state}`}
            key={step.id}
            onClick={() => dispatch({ type: 'jump', screen: index as Screen })}
            type="button"
          >
            <span className="step-node">{state === 'done' ? '✓' : step.n}</span>
            <span className="step-labels">
              <span>{t(step.label, lang)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Shell({
  state,
  dispatch,
  children,
}: {
  state: State
  dispatch: React.Dispatch<Action>
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">S</span>
            <span>{content.global.brand}</span>
          </div>
          <Stepper dispatch={dispatch} lang={state.lang} screen={state.screen} />
          <div className="lang-toggle" aria-label="Language">
            {(['vi', 'en'] as const).map((code, index) => (
              <button
                className={state.lang === code ? 'active' : ''}
                key={code}
                onClick={() => dispatch({ type: 'setLang', lang: code })}
                type="button"
              >
                {content.global.langToggle[index]}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="back-row">
        {state.screen > 0 && (
          <button className="back-button" onClick={() => dispatch({ type: 'back' })} type="button">
            ← {t(content.global.back, state.lang)}
          </button>
        )}
      </div>
      <main className="main-stage">
        {state.error && (
          <div className="state-note error-note">
            {state.error}
            <button onClick={() => dispatch({ type: 'clearError' })} type="button">
              ×
            </button>
          </div>
        )}
        <div className="screen-fade" key={state.screen}>
          {children}
        </div>
      </main>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const toneClass =
    message.tone === 'warning' ? ' tone-warning' : message.tone === 'success' ? ' tone-success' : ''

  return (
    <div className={`message-row ${message.role}`}>
      <div className={`message-bubble ${message.role}${toneClass}`}>
        {message.label && <div className="bubble-label">{message.label}</div>}
        <p>{message.text}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="chip-row">
            {message.sources.slice(0, 4).map((source) => (
              <SourceChip key={source} label={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IntakeScreen({
  state,
  onSubmit,
  onFileSelect,
  onMockProfile,
  dispatch,
}: {
  state: State
  onSubmit: () => void
  onFileSelect: (file: File) => void
  onMockProfile: () => void
  dispatch: React.Dispatch<Action>
}) {
  const profile = state.agentState.profile
  const lang = state.lang
  const upload = content.scr01_intake.upload

  return (
    <div>
      <ScreenIntro
        lang={lang}
        subtitle={content.scr01_intake.subtitle}
        title={content.scr01_intake.title}
      />
      <div className="intake-grid">
        <div className="intake-main">
          <Card className="upload-card">
            <div className="upload-head">
              <div>
                <h3>{t(upload.title, lang)}</h3>
                <p>{t(upload.subtitle, lang)}</p>
              </div>
              <Button disabled={state.busy !== 'idle'} onClick={onMockProfile} variant="secondary">
                {t(content.scr01_intake.mockProfileButton, lang)}
              </Button>
            </div>
            <label className="upload-dropzone">
              <input
                accept=".txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif"
                disabled={state.busy !== 'idle'}
                hidden
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  if (file) {
                    onFileSelect(file)
                  }
                  event.currentTarget.value = ''
                }}
                type="file"
              />
              <span className="upload-icon">↑</span>
              <span className="upload-title">{t(upload.dropHint, lang)}</span>
              <span className="upload-meta">{t(upload.acceptLabel, lang)}</span>
              {state.busy === 'intake' && (
                <span className="upload-status">{t(upload.analyzing, lang)}</span>
              )}
            </label>
          </Card>
          <Card className="chat-card">
          <div className="chat-scroll">
            {state.messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}-${message.text}`} message={message} />
            ))}
            {state.busy === 'intake' && (
              <div className="message-row agent">
                <div className="message-bubble agent">
                  <div className="bubble-label">SoPilot</div>
                  <TypingDots lang={lang} />
                </div>
              </div>
            )}
          </div>
          <form
            className="input-dock"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <textarea
              onChange={(event) =>
                dispatch({ type: 'setIntakeInput', value: event.currentTarget.value })
              }
              placeholder={t(content.scr01_intake.inputPlaceholder, lang)}
              value={state.intakeInput}
            />
            <button aria-label="Send" className="send-button" disabled={state.busy !== 'idle'} type="submit">
              ↑
            </button>
          </form>
        </Card>
        </div>
        <ProfileCard
          cta={() => dispatch({ type: 'jump', screen: 1 })}
          fit={state.fit}
          lang={lang}
          profile={profile}
        />
      </div>
    </div>
  )
}

function ProfileCard({
  profile,
  fit,
  cta,
  lang,
}: {
  profile: Profile
  fit: ScoreFitResult | null
  cta: () => void
  lang: Lang
}) {
  const card = content.scr01_intake.profileCard
  const facts = profileFacts(profile, lang)

  return (
    <Card dark className="profile-card">
      <div className="profile-head">
        <span>{t(card.liveHeading, lang)}</span>
        <span>
          {facts.length} {t(card.itemsLabel, lang)}
        </span>
      </div>
      <h2>{profile.targetProgram ?? t(card.noProgram, lang)}</h2>
      <p>{profile.education ?? t(card.educationPending, lang)}</p>
      <div className="dark-divider" />
      <div className="facts-list">
        {facts.map((fact) => (
          <div className="fact-row" key={fact.text}>
            <span className={fact.state === 'captured' ? 'fact-icon captured' : 'fact-icon gap'}>
              {fact.state === 'captured' ? '✓' : '!'}
            </span>
            <span className="fact-copy">
              <span>{fact.text}</span>
              {fact.gap && <small>{fact.gap}</small>}
            </span>
          </div>
        ))}
      </div>
      <Button disabled={!fit} onClick={cta}>
        {t(card.cta, lang)}
      </Button>
    </Card>
  )
}

function ShortlistScreen({
  state,
  dispatch,
}: {
  state: State
  dispatch: React.Dispatch<Action>
}) {
  const profile = state.agentState.profile
  const fit = state.fit
  const lang = state.lang
  const shortlist = content.scr02_shortlist

  return (
    <div>
      <ScreenIntro lang={lang} subtitle={shortlist.subtitle} title={shortlist.title} />
      {!state.search?.found && (
        <div className="state-note subtle-state">{t(content.states.degraded.search, lang)}</div>
      )}
      {fit ? (
        <div className="target-stack">
          <Card className="target-card">
            <div className="target-head">
              <div>
                <h2>{profile.targetProgram ?? t(shortlist.targetProgramFallback, lang)}</h2>
                <p>
                  {profile.level} · {profile.targetCountry || t(shortlist.targetCountryPending, lang)}
                </p>
              </div>
              <FitBand band={fit.band} lang={lang} />
            </div>
            <div className="criteria-grid">
              {fit.checks.map((check) => (
                <CriteriaRow
                  key={`${check.criterion}-${check.detail}`}
                  met={check.met}
                  text={`${check.criterion}: ${check.detail}`}
                />
              ))}
            </div>
            <div className="gap-callout">
              <span>{t(shortlist.gapLabel, lang)}</span>
              <p>{fit.gaps.at(0) ?? t(shortlist.noGap, lang)}</p>
            </div>
            <div className="chip-row">
              {state.search?.sources.map((source) => (
                <SourceChip
                  key={source.url}
                  label={source.url}
                  prefix={t(shortlist.sourcePrefix, lang)}
                />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="state-note">{t(content.states.empty.intake, lang)}</div>
      )}
      <div className="footer-action">
        <Button disabled={!fit} onClick={() => dispatch({ type: 'jump', screen: 2 })}>
          {t(shortlist.cta, lang)}
        </Button>
      </div>
    </div>
  )
}

function DraftScreen({
  state,
  onScaffold,
  onStart,
  dispatch,
}: {
  state: State
  onScaffold: () => void
  onStart: () => void
  dispatch: React.Dispatch<Action>
}) {
  const lang = state.lang
  const draftCopy = content.scr03_draft

  return (
    <div>
      <div className="draft-head">
        <ScreenIntro lang={lang} subtitle={draftCopy.subtitle} title={draftCopy.title} />
        <div className="writing-chip">
          <span>{t(draftCopy.writingForLabel, lang)}</span>
          <strong>{state.agentState.profile.targetProgram ?? draftCopy.writingForValue}</strong>
        </div>
      </div>
      <Card className="editor-card">
        <div className="editor-toolbar">
          <span>{t(draftCopy.editorLabel, lang)}</span>
          <Button disabled={state.busy !== 'idle'} onClick={onScaffold} variant="secondary">
            ✦{' '}
            {state.busy === 'draft'
              ? t(content.states.loading, lang)
              : t(draftCopy.draftItButton, lang)}
          </Button>
        </div>
        <textarea
          className="draft-editor"
          onChange={(event) => dispatch({ type: 'setDraftText', value: event.currentTarget.value })}
          placeholder={t(draftCopy.editorPlaceholder, lang)}
          value={state.draftText}
        />
        <div className="editor-footer">
          <span>
            {wordCount(state.draftText)} {t(draftCopy.wordCountLabel, lang)}
            {state.busy === 'draft' && <TypingDots lang={lang} />}
          </span>
          <Button disabled={!state.draftText.trim() || state.busy !== 'idle'} onClick={onStart}>
            {t(draftCopy.cta, lang)}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Avatar({ state, complete }: { state: State; complete: boolean }) {
  const lang = state.lang
  const speaking = state.ttsOn && !complete
  const status = speaking
    ? content.scr04_interrogation.status.speaking
    : content.scr04_interrogation.status.awaiting

  return (
    <div className="avatar-panel">
      <div className={`avatar-wrap ${speaking ? 'speaking' : ''}`}>
        {speaking && (
          <>
            <span className="speak-ring one" />
            <span className="speak-ring two" />
          </>
        )}
        <div className="avatar-face">
          <span className="hair" />
          <span className="neck" />
          <span className="face" />
          <span className="glasses left" />
          <span className="glasses right" />
          <span className="bridge" />
          <span className="eye left" />
          <span className="eye right" />
          <span className="mouth" />
        </div>
      </div>
      <h2>{content.scr04_interrogation.avatar.name}</h2>
      <p>{t(content.scr04_interrogation.avatar.role, lang)}</p>
      <span className={`status-pill ${speaking ? 'voice' : 'waiting'}`}>
        <span />
        {t(status, lang)}
      </span>
    </div>
  )
}

function ProgressPips({ session }: { session: InterrogationSession }) {
  return (
    <div className="progress-pips">
      {Array.from({ length: 4 }).map((_, index) => (
        <span
          className={index < session.turns.length - 1 ? 'done' : index === session.turns.length - 1 ? 'current' : ''}
          key={index}
        />
      ))}
    </div>
  )
}

function SpotlightDraft({ draft, target }: { draft: string; target: string }) {
  const parts = draft.includes(target) ? draft.split(target) : [draft, '']

  return (
    <Card className="spotlight-card">
      <p>
        <span>{parts[0]}</span>
        <span className="spotlight-token">{target}</span>
        <span>{parts.slice(1).join(target)}</span>
      </p>
    </Card>
  )
}

function InterrogationScreen({
  state,
  onAnswer,
  onRewrite,
  dispatch,
}: {
  state: State
  onAnswer: () => void
  onRewrite: () => void
  dispatch: React.Dispatch<Action>
}) {
  const session = state.session
  const draft = state.draft
  const lang = state.lang
  const interrogation = content.scr04_interrogation
  const turn = session?.turns.find((item) => !item.answer) ?? session?.turns.at(-1)
  const complete = Boolean(session && session.turns.every((item) => item.answer))

  if (!session || !draft || !turn) {
    return (
      <div className="generating-stage">
        <TypingDots lang={lang} />
        <h1>{t(content.states.loading, lang)}</h1>
      </div>
    )
  }

  return (
    <div className="interrogation-grid">
      <div>
        <Avatar complete={complete} state={state} />
        <Button onClick={() => dispatch({ type: 'toggleTts' })} variant="secondary">
          {state.ttsOn
            ? t(interrogation.ttsToggle.on, lang)
            : t(interrogation.ttsToggle.off, lang)}
        </Button>
        {!state.ttsOn && (
          <div className="state-note voice-note">
            {t(interrogation.degradedNote, lang)}
          </div>
        )}
      </div>
      {complete ? (
        <Card className="complete-card">
          <span className="eyebrow">{t(interrogation.complete.eyebrow, lang)}</span>
          <h1>{t(interrogation.complete.title, lang)}</h1>
          <p>{t(interrogation.complete.body, lang)}</p>
          <Button disabled={state.busy !== 'idle'} onClick={onRewrite}>
            {t(interrogation.complete.cta, lang)}
          </Button>
        </Card>
      ) : (
        <div className="interrogate-work">
          <div className="turn-row">
            <span>
              {t(interrogation.turnLabel, lang)} {turn.index + 1} / 4
            </span>
            <ProgressPips session={session} />
          </div>
          <SpotlightDraft draft={draft.body} target={turn.targetSentence} />
          <Card dark className="question-card">
            <span className="eyebrow">{turn.framingTag}</span>
            <h1>{turn.question}</h1>
          </Card>
          <Card className="answer-card">
            <textarea
              onChange={(event) =>
                dispatch({ type: 'setAnswerInput', value: event.currentTarget.value })
              }
              placeholder={t(interrogation.answerPlaceholder, lang)}
              value={state.answerInput}
            />
            <div className="answer-footer">
              <p>{t(interrogation.reassurance, lang)}</p>
              <Button disabled={state.busy !== 'idle'} onClick={onAnswer}>
                {state.busy === 'interrogation'
                  ? t(content.states.loading, lang)
                  : t(interrogation.submitButton, lang)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function RevealScreen({ state, onPushFurther }: { state: State; onPushFurther: () => void }) {
  const lang = state.lang
  const reveal = content.scr05_reveal

  if (state.busy === 'rewrite' || !state.rewrite || !state.draft) {
    return (
      <div className="generating-stage">
        <TypingDots lang={lang} />
        <h1>{t(reveal.generating.title, lang)}</h1>
        <p>{t(reveal.generating.body, lang)}</p>
      </div>
    )
  }

  return (
    <div className="reveal-screen">
      <Card dark className="banner-card">
        <div>
          <span className="eyebrow">{t(reveal.banner.eyebrow, lang)}</span>
          <h1>{t(reveal.banner.title, lang)}</h1>
          <p>{t(reveal.banner.body, lang)}</p>
        </div>
        <div className="framing-chip">
          <span>{state.rewrite.framingScoreBefore}</span>
          <strong>→</strong>
          <em>{state.rewrite.framingScoreAfter}</em>
        </div>
      </Card>
      <div className="before-after-grid">
        <Card className="essay-card before">
          <span className="essay-label">
            <i />
            {t(reveal.beforeLabel, lang)}
          </span>
          <p>{state.draft.body}</p>
        </Card>
        <Card className="essay-card after">
          <span className="essay-label">
            <i />
            {t(reveal.afterLabel, lang)}
          </span>
          <p>{state.rewrite.rewrittenText}</p>
        </Card>
      </div>
      <section>
        <h2 className="why-title">{t(reveal.whyHeading, lang)}</h2>
        <div className="why-grid">
          {state.rewrite.changes.map((change) => (
            <Card className="why-card" key={`${change.before}-${change.after}`}>
              <strong>{change.after}</strong>
              <p>{change.framingReason}</p>
              <span>{change.groundedIn}</span>
            </Card>
          ))}
        </div>
      </section>
      <div className="footer-action reveal-actions">
        <Button
          onClick={() => {
            void navigator.clipboard?.writeText(state.rewrite?.rewrittenText ?? '')
          }}
          variant="dark"
        >
          {t(reveal.actions.export, lang)}
        </Button>
        <Button onClick={onPushFurther} variant="secondary">
          {t(reveal.actions.pushFurther, lang)}
        </Button>
      </div>
    </div>
  )
}

function ScreenIntro({
  title,
  subtitle,
  lang,
}: {
  title: Bilingual
  subtitle: Bilingual
  lang: Lang
}) {
  return (
    <div className="screen-intro">
      <h1>{t(title, lang)}</h1>
      <p>{t(subtitle, lang)}</p>
    </div>
  )
}

type ProfileFact = { state: 'captured' | 'gap'; text: string; gap?: string }

function profileFacts(profile: Profile, lang: Lang): ProfileFact[] {
  const card = content.scr01_intake.profileCard
  const facts: ProfileFact[] = []

  if (profile.education) {
    facts.push({ state: 'captured', text: profile.education })
  }

  facts.push(...profile.awards.map((award) => ({ state: 'captured' as const, text: award })))
  facts.push(
    ...profile.activities.map((activity) => ({
      state: 'captured' as const,
      text: [activity.title, activity.role, activity.contribution].filter(Boolean).join(' · '),
    })),
  )
  facts.push(
    ...profile.gapFlags.map((gap) => ({
      state: 'gap' as const,
      text: gap,
      gap: t(card.gapHint, lang),
    })),
  )

  return facts.length > 0
    ? facts
    : [{ state: 'gap', text: t(card.noIntakeData, lang), gap: t(card.intakeHint, lang) }]
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  async function handleIntake() {
    const message = state.intakeInput.trim()

    if (!message) {
      dispatch({ type: 'error', message: t(content.states.error, state.lang) })
      return
    }

    dispatch({ type: 'startIntake', message })
    const result = await runIntakeStep({ state: state.agentState, userMessage: message })

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishIntake', result: result.data })
  }

  async function handleFileIntake(file: File) {
    dispatch({ type: 'startFileIntake', fileName: file.name })
    const payload = await readIntakeFile(file)

    if (!payload.ok) {
      dispatch({ type: 'error', message: payload.error })
      return
    }

    const result = await runFileIntakeStep({ state: state.agentState, file: payload.data })

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishFileIntake', result: result.data })
  }

  async function handleMockProfile() {
    dispatch({ type: 'startMockIntake' })
    const result = await runMockDemoIntake(state.agentState)

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishMockIntake', result: result.data })
  }

  async function handleScaffold() {
    dispatch({ type: 'startDraft' })
    const result = await scaffoldDraft({ profile: state.agentState.profile })

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishDraft', draft: result.data })
  }

  async function handleStartInterrogation() {
    const draft =
      state.draft?.body === state.draftText
        ? state.draft
        : {
            id: `draft-${Date.now().toString(36)}`,
            body: state.draftText,
            version: 0,
            source: 'pasted' as const,
          }

    dispatch({ type: 'startInterrogation', draft })
    const result = await nextInterrogationTurn({
      draft,
      profile: state.agentState.profile,
      session: null,
      lastAnswer: null,
    })

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishInterrogation', session: result.data.session, done: result.data.done })
  }

  async function handleAnswer() {
    if (!state.draft || !state.session) {
      dispatch({ type: 'error', message: 'Draft/session is not ready.' })
      return
    }

    if (!state.answerInput.trim()) {
      dispatch({ type: 'error', message: t(content.states.insufficientData, state.lang) })
      return
    }

    dispatch({ type: 'startInterrogation', draft: state.draft })
    const result = await nextInterrogationTurn({
      draft: state.draft,
      profile: state.agentState.profile,
      session: state.session,
      lastAnswer: state.answerInput,
    })

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishInterrogation', session: result.data.session, done: result.data.done })
  }

  async function handleRewrite() {
    if (!state.draft || !state.session) {
      dispatch({ type: 'error', message: 'Draft/session is not ready.' })
      return
    }

    dispatch({ type: 'startRewrite' })
    const result = await generateRewrite({
      draft: state.draft,
      profile: state.agentState.profile,
      session: state.session,
    })

    if (!result.ok) {
      dispatch({ type: 'error', message: result.error })
      return
    }

    dispatch({ type: 'finishRewrite', rewrite: result.data })
  }

  let screen: React.ReactNode

  switch (state.screen) {
    case 0:
      screen = (
        <IntakeScreen
          dispatch={dispatch}
          onFileSelect={handleFileIntake}
          onMockProfile={handleMockProfile}
          onSubmit={handleIntake}
          state={state}
        />
      )
      break
    case 1:
      screen = <ShortlistScreen dispatch={dispatch} state={state} />
      break
    case 2:
      screen = (
        <DraftScreen
          dispatch={dispatch}
          onScaffold={handleScaffold}
          onStart={handleStartInterrogation}
          state={state}
        />
      )
      break
    case 3:
      screen = (
        <InterrogationScreen
          dispatch={dispatch}
          onAnswer={handleAnswer}
          onRewrite={handleRewrite}
          state={state}
        />
      )
      break
    case 4:
      screen = <RevealScreen onPushFurther={() => dispatch({ type: 'jump', screen: 3 })} state={state} />
      break
    default:
      screen = null
  }

  return (
    <Shell dispatch={dispatch} state={state}>
      {screen}
    </Shell>
  )
}

export default App
