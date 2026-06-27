import { useReducer } from 'react'
import copy from '../docs/page-content.json'
import {
  canJumpToScreen,
  generateRewrite,
  nextInterrogationTurn,
  runIntakeStep,
  scaffoldDraft,
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
      const seed = seedMessage(action.lang)
      const messages =
        state.messages.length === 1 && state.messages[0]?.role === 'agent'
          ? [seed]
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

function FitBand({ band }: { band: ScoreFitResult['band'] }) {
  const label =
    band === 'strong_match'
      ? { vi: 'PHÙ HỢP TỐT', en: 'STRONG MATCH' }
      : band === 'competitive'
        ? { vi: 'CẠNH TRANH', en: 'COMPETITIVE' }
        : band === 'reach'
          ? { vi: 'THÁCH THỨC', en: 'REACH' }
          : { vi: 'CHƯA ĐỦ DỮ LIỆU', en: 'INSUFFICIENT' }
  const key = band === 'strong_match' ? 'strongMatch' : band

  return (
    <span className={`fit-band fit-${key}`}>
      <span />
      {label.vi} · {label.en}
    </span>
  )
}

function CriteriaRow({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="criteria-row">
      <span className={met ? 'criteria-mark met' : 'criteria-mark unmet'}>{met ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="typing-dots" aria-label={bilingual(content.states.loading)}>
      <span />
      <span />
      <span />
    </span>
  )
}

function Stepper({ screen, dispatch }: { screen: Screen; dispatch: React.Dispatch<Action> }) {
  return (
    <div className="stepper" aria-label="Hành trình">
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
              <span>{step.label.vi}</span>
              <span>{step.label.en}</span>
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
          <Stepper dispatch={dispatch} screen={state.screen} />
          <div className="lang-toggle" aria-label="Language">
            {content.global.langToggle.map((lang, index) => (
              <span className={index === 0 ? 'active' : ''} key={lang}>
                {lang}
              </span>
            ))}
          </div>
        </div>
      </header>
      <div className="back-row">
        {state.screen > 0 && (
          <button className="back-button" onClick={() => dispatch({ type: 'back' })} type="button">
            ← {content.global.back.vi} <span>· {content.global.back.en}</span>
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
  return (
    <div className={`message-row ${message.role}`}>
      <div className={`message-bubble ${message.role}`}>
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
  dispatch,
}: {
  state: State
  onSubmit: () => void
  dispatch: React.Dispatch<Action>
}) {
  const profile = state.agentState.profile

  return (
    <div>
      <ScreenIntro title={content.scr01_intake.title} subtitle={content.scr01_intake.subtitle} />
      <div className="intake-grid">
        <Card className="chat-card">
          <div className="chat-scroll">
            {state.messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}-${message.text}`} message={message} />
            ))}
            {state.busy === 'intake' && (
              <div className="message-row agent">
                <div className="message-bubble agent">
                  <div className="bubble-label">SoPilot</div>
                  <TypingDots />
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
              placeholder={content.scr01_intake.inputPlaceholder.vi}
              value={state.intakeInput}
            />
            <button aria-label="Send" className="send-button" disabled={state.busy !== 'idle'} type="submit">
              ↑
            </button>
          </form>
        </Card>
        <ProfileCard
          cta={() => dispatch({ type: 'jump', screen: 1 })}
          fit={state.fit}
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
}: {
  profile: Profile
  fit: ScoreFitResult | null
  cta: () => void
}) {
  const facts = profileFacts(profile)

  return (
    <Card dark className="profile-card">
      <div className="profile-head">
        <span>Hồ sơ thật</span>
        <span>{facts.length} mục</span>
      </div>
      <h2>{profile.targetProgram ?? 'Chưa chọn ngành'}</h2>
      <p>{profile.education ?? 'Thông tin học tập sẽ hiện ở đây sau intake.'}</p>
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
        {bilingual(content.scr01_intake.profileCard.cta)}
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

  return (
    <div>
      <ScreenIntro title={content.scr02_shortlist.title} subtitle={content.scr02_shortlist.subtitle} />
      {!state.search?.found && (
        <div className="state-note subtle-state">{bilingual(content.states.degraded.search)}</div>
      )}
      {fit ? (
        <div className="target-stack">
          <Card className="target-card">
            <div className="target-head">
              <div>
                <h2>{profile.targetProgram ?? 'Target program'}</h2>
                <p>{profile.level} · {profile.targetCountry || 'Target country pending'}</p>
              </div>
              <FitBand band={fit.band} />
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
              <span>{bilingual(content.scr02_shortlist.gapLabel)}</span>
              <p>{fit.gaps.at(0) ?? 'No critical gap found from sourced criteria.'}</p>
            </div>
            <div className="chip-row">
              {state.search?.sources.map((source) => (
                <SourceChip
                  key={source.url}
                  label={source.url}
                  prefix={content.scr02_shortlist.sourcePrefix.vi}
                />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="state-note">{bilingual(content.states.empty.intake)}</div>
      )}
      <div className="footer-action">
        <Button disabled={!fit} onClick={() => dispatch({ type: 'jump', screen: 2 })}>
          {bilingual(content.scr02_shortlist.cta)}
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
  return (
    <div>
      <div className="draft-head">
        <ScreenIntro title={content.scr03_draft.title} subtitle={content.scr03_draft.subtitle} />
        <div className="writing-chip">
          <span>{bilingual(content.scr03_draft.writingForLabel)}</span>
          <strong>{state.agentState.profile.targetProgram ?? content.scr03_draft.writingForValue}</strong>
        </div>
      </div>
      <Card className="editor-card">
        <div className="editor-toolbar">
          <span>{bilingual(content.scr03_draft.editorLabel)}</span>
          <Button disabled={state.busy !== 'idle'} onClick={onScaffold} variant="secondary">
            ✦ {state.busy === 'draft' ? bilingual(content.states.loading) : bilingual(content.scr03_draft.draftItButton)}
          </Button>
        </div>
        <textarea
          className="draft-editor"
          onChange={(event) => dispatch({ type: 'setDraftText', value: event.currentTarget.value })}
          placeholder={content.scr03_draft.editorPlaceholder.vi}
          value={state.draftText}
        />
        <div className="editor-footer">
          <span>
            {wordCount(state.draftText)} {bilingual(content.scr03_draft.wordCountLabel)}
            {state.busy === 'draft' && <TypingDots />}
          </span>
          <Button disabled={!state.draftText.trim() || state.busy !== 'idle'} onClick={onStart}>
            {bilingual(content.scr03_draft.cta)}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Avatar({ state, complete }: { state: State; complete: boolean }) {
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
      <p>{bilingual(content.scr04_interrogation.avatar.role)}</p>
      <span className={`status-pill ${speaking ? 'voice' : 'waiting'}`}>
        <span />
        {bilingual(status)}
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
  const turn = session?.turns.find((item) => !item.answer) ?? session?.turns.at(-1)
  const complete = Boolean(session && session.turns.every((item) => item.answer))

  if (!session || !draft || !turn) {
    return (
      <div className="generating-stage">
        <TypingDots />
        <h1>{bilingual(content.states.loading)}</h1>
      </div>
    )
  }

  return (
    <div className="interrogation-grid">
      <div>
        <Avatar complete={complete} state={state} />
        <Button onClick={() => dispatch({ type: 'toggleTts' })} variant="secondary">
          {state.ttsOn
            ? content.scr04_interrogation.ttsToggle.on
            : content.scr04_interrogation.ttsToggle.off}
        </Button>
        {!state.ttsOn && (
          <div className="state-note voice-note">
            {bilingual(content.scr04_interrogation.degradedNote)}
          </div>
        )}
      </div>
      {complete ? (
        <Card className="complete-card">
          <span className="eyebrow">{bilingual(content.scr04_interrogation.complete.eyebrow)}</span>
          <h1>{bilingual(content.scr04_interrogation.complete.title)}</h1>
          <p>{bilingual(content.scr04_interrogation.complete.body)}</p>
          <Button disabled={state.busy !== 'idle'} onClick={onRewrite}>
            {bilingual(content.scr04_interrogation.complete.cta)}
          </Button>
        </Card>
      ) : (
        <div className="interrogate-work">
          <div className="turn-row">
            <span>
              {bilingual(content.scr04_interrogation.turnLabel)} {turn.index + 1} / 4
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
              placeholder={content.scr04_interrogation.answerPlaceholder.vi}
              value={state.answerInput}
            />
            <div className="answer-footer">
              <p>{bilingual(content.scr04_interrogation.reassurance)}</p>
              <Button disabled={state.busy !== 'idle'} onClick={onAnswer}>
                {state.busy === 'interrogation'
                  ? bilingual(content.states.loading)
                  : bilingual(content.scr04_interrogation.submitButton)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function RevealScreen({ state, onPushFurther }: { state: State; onPushFurther: () => void }) {
  if (state.busy === 'rewrite' || !state.rewrite || !state.draft) {
    return (
      <div className="generating-stage">
        <TypingDots />
        <h1>{bilingual(content.scr05_reveal.generating.title)}</h1>
        <p>{bilingual(content.scr05_reveal.generating.body)}</p>
      </div>
    )
  }

  return (
    <div className="reveal-screen">
      <Card dark className="banner-card">
        <div>
          <span className="eyebrow">{bilingual(content.scr05_reveal.banner.eyebrow)}</span>
          <h1>{bilingual(content.scr05_reveal.banner.title)}</h1>
          <p>{bilingual(content.scr05_reveal.banner.body)}</p>
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
            {bilingual(content.scr05_reveal.beforeLabel)}
          </span>
          <p>{state.draft.body}</p>
        </Card>
        <Card className="essay-card after">
          <span className="essay-label">
            <i />
            {bilingual(content.scr05_reveal.afterLabel)}
          </span>
          <p>{state.rewrite.rewrittenText}</p>
        </Card>
      </div>
      <section>
        <h2 className="why-title">{bilingual(content.scr05_reveal.whyHeading)}</h2>
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
          {bilingual(content.scr05_reveal.actions.export)}
        </Button>
        <Button onClick={onPushFurther} variant="secondary">
          {bilingual(content.scr05_reveal.actions.pushFurther)}
        </Button>
      </div>
    </div>
  )
}

function ScreenIntro({
  title,
  subtitle,
}: {
  title: { vi: string; en: string }
  subtitle: { vi: string; en: string }
}) {
  return (
    <div className="screen-intro">
      <h1>{title.vi}</h1>
      <p>{title.en}</p>
      <p>{subtitle.vi}</p>
      <small>{subtitle.en}</small>
    </div>
  )
}

type ProfileFact = { state: 'captured' | 'gap'; text: string; gap?: string }

function profileFacts(profile: Profile): ProfileFact[] {
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
    ...profile.gapFlags.map((gap) => ({ state: 'gap' as const, text: gap, gap: 'Cần bổ sung' })),
  )

  return facts.length > 0
    ? facts
    : [{ state: 'gap', text: 'Chưa có dữ liệu intake.', gap: 'Hãy gửi vài dòng về hồ sơ.' }]
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  async function handleIntake() {
    const message = state.intakeInput.trim()

    if (!message) {
      dispatch({ type: 'error', message: bilingual(content.states.error) })
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
      dispatch({ type: 'error', message: bilingual(content.states.insufficientData) })
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
      screen = <IntakeScreen dispatch={dispatch} onSubmit={handleIntake} state={state} />
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
