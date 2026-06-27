import { useEffect, useMemo, useReducer } from 'react'
import copy from '../docs/page-content.json'
import CoLinhAvatar from './components/CoLinhAvatar'
import './App.css'

type Screen = 0 | 1 | 2 | 3 | 4
type Message = {
  role: 'agent' | 'user'
  label?: string
  text: string
  sources?: string[]
}

type State = {
  screen: Screen
  intakeInput: string
  messages: Message[]
  draftText: string
  turn: number
  answerInput: string
  ttsOn: boolean
  generating: boolean
  revealed: boolean
  typing: boolean
  streamingDraft: boolean
  error: string
}

type Action =
  | { type: 'jump'; screen: Screen }
  | { type: 'back' }
  | { type: 'setIntakeInput'; value: string }
  | { type: 'sendIntake' }
  | { type: 'finishTyping' }
  | { type: 'setDraftText'; value: string }
  | { type: 'startDraftStream' }
  | { type: 'draftStreamTick'; value: string; done: boolean }
  | { type: 'setAnswerInput'; value: string }
  | { type: 'submitAnswer' }
  | { type: 'toggleTts' }
  | { type: 'showReveal' }
  | { type: 'finishReveal' }
  | { type: 'pushFurther' }
  | { type: 'clearError' }

const content = copy as typeof copy
const steps = content.global.stepper
const initialMessages = content.scr01_intake.messages as Message[]

const initialState: State = {
  screen: 0,
  intakeInput: '',
  messages: initialMessages,
  draftText: '',
  turn: 0,
  answerInput: '',
  ttsOn: true,
  generating: false,
  revealed: false,
  typing: false,
  streamingDraft: false,
  error: '',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'jump':
      if (action.screen === 4) {
        return { ...state, screen: 4, generating: true, revealed: false, error: '' }
      }
      return { ...state, screen: action.screen, error: '' }
    case 'back':
      return {
        ...state,
        screen: Math.max(0, state.screen - 1) as Screen,
        error: '',
      }
    case 'setIntakeInput':
      return { ...state, intakeInput: action.value, error: '' }
    case 'sendIntake': {
      const text = state.intakeInput.trim()
      if (!text) {
        return {
          ...state,
          error: bilingual(content.states.empty.intake),
        }
      }
      return {
        ...state,
        intakeInput: '',
        messages: [...state.messages, { role: 'user', text }],
        typing: true,
        error: '',
      }
    }
    case 'finishTyping':
      return {
        ...state,
        typing: false,
        messages: [
          ...state.messages,
          {
            role: 'agent',
            label: 'SoPilot',
            text: content.scr01_intake.messages[4].text,
            sources: ['berkeley.edu/me', 'usnews.edu'],
          },
        ],
      }
    case 'setDraftText':
      return { ...state, draftText: action.value, error: '' }
    case 'startDraftStream':
      return { ...state, draftText: '', streamingDraft: true, error: '' }
    case 'draftStreamTick':
      return {
        ...state,
        draftText: action.value,
        streamingDraft: !action.done,
      }
    case 'setAnswerInput':
      return { ...state, answerInput: action.value, error: '' }
    case 'submitAnswer': {
      if (!state.answerInput.trim()) {
        return { ...state, error: bilingual(content.states.empty.answer) }
      }
      return {
        ...state,
        turn: state.turn + 1,
        answerInput: '',
        error: '',
      }
    }
    case 'toggleTts':
      return { ...state, ttsOn: !state.ttsOn }
    case 'showReveal':
      return { ...state, screen: 4, generating: true, revealed: false, error: '' }
    case 'finishReveal':
      return { ...state, generating: false, revealed: true }
    case 'pushFurther':
      return { ...state, screen: 3, turn: 0, answerInput: '', revealed: false, generating: false }
    case 'clearError':
      return { ...state, error: '' }
    default:
      return state
  }
}

function bilingual(value: { vi: string; en: string }) {
  return `${value.vi} · ${value.en}`
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isDone(state: State) {
  return state.screen === 3 && state.turn >= content.scr04_interrogation.turns.length
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
  return (
    <span className="source-chip">
      <span />
      {prefix ? `${prefix} · ${label}` : label}
    </span>
  )
}

function FitBand({ band }: { band: string }) {
  const key = band === 'strong' ? 'strongMatch' : band
  const data = content.scr02_shortlist.targets.find((target) => target.band === band)
  const label =
    key === 'strongMatch'
      ? { vi: 'PHÙ HỢP TỐT', en: 'STRONG MATCH' }
      : key === 'competitive'
        ? { vi: 'CÓ CẠNH TRANH', en: 'COMPETITIVE' }
        : { vi: 'MỤC TIÊU CAO', en: 'REACH' }

  return (
    <span className={`fit-band fit-${key}`} title={data?.name}>
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

function DiffText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, index) => {
        const added = part.startsWith('[') && part.endsWith(']')
        return added ? (
          <span className="diff-token" key={`${part}-${index}`}>
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      })}
    </>
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
    <div className="stepper" aria-label="Hành trình làm hồ sơ">
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
          <Stepper screen={state.screen} dispatch={dispatch} />
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
        {message.sources && (
          <div className="chip-row">
            {message.sources.map((source) => (
              <SourceChip key={source} label={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IntakeScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const profile = content.scr01_intake.profileCard
  const empty = state.messages.length === 0

  return (
    <div>
      <ScreenIntro title={content.scr01_intake.title} subtitle={content.scr01_intake.subtitle} />
      <div className="intake-grid">
        <Card className="chat-card">
          <div className="chat-scroll">
            {empty ? (
              <div className="state-note">{bilingual(content.states.empty.intake)}</div>
            ) : (
              state.messages.map((message, index) => (
                <MessageBubble key={`${message.role}-${index}-${message.text}`} message={message} />
              ))
            )}
            {state.typing && (
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
              dispatch({ type: 'sendIntake' })
            }}
          >
            <textarea
              onChange={(event) =>
                dispatch({ type: 'setIntakeInput', value: event.currentTarget.value })
              }
              placeholder={content.scr01_intake.inputPlaceholder.vi}
              value={state.intakeInput}
            />
            <button aria-label="Gửi thông tin" className="send-button" type="submit">
              ↑
            </button>
          </form>
        </Card>
        <Card dark className="profile-card">
          <div className="profile-head">
            <span>{profile.heading.vi}</span>
            <span>{profile.facts.length} mục</span>
          </div>
          <h2>{profile.name}</h2>
          <p>{profile.sub.vi}</p>
          <div className="dark-divider" />
          <div className="facts-list">
            {profile.facts.map((fact) => (
              <div className="fact-row" key={fact.text}>
                <span className={fact.state === 'captured' ? 'fact-icon captured' : 'fact-icon gap'}>
                  {fact.state === 'captured' ? '✓' : '⚑'}
                </span>
                <span className="fact-copy">
                  <span>{fact.text}</span>
                  {'gap' in fact && <small>⚑ {fact.gap}</small>}
                </span>
              </div>
            ))}
          </div>
          <Button onClick={() => dispatch({ type: 'jump', screen: 1 })}>
            {bilingual(profile.cta)}
          </Button>
        </Card>
      </div>
    </div>
  )
}

function ShortlistScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  return (
    <div>
      <ScreenIntro title={content.scr02_shortlist.title} subtitle={content.scr02_shortlist.subtitle} />
      <div className="state-note subtle-state">{bilingual(content.states.degraded.search)}</div>
      <div className="target-stack">
        {content.scr02_shortlist.targets.map((target) => (
          <Card className="target-card" key={target.name}>
            <div className="target-head">
              <div>
                <h2>{target.name}</h2>
                <p>{target.sub}</p>
              </div>
              <FitBand band={target.band} />
            </div>
            <div className="criteria-grid">
              {target.criteria.map((criterion) => (
                <CriteriaRow key={criterion.text} met={criterion.met} text={criterion.text} />
              ))}
            </div>
            <div className="gap-callout">
              <span>{bilingual(content.scr02_shortlist.gapLabel)}</span>
              <p>{target.gap}</p>
            </div>
            <div className="chip-row">
              {target.sources.map((source) => (
                <SourceChip
                  key={source}
                  label={source}
                  prefix={content.scr02_shortlist.sourcePrefix.vi}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="footer-action">
        <Button onClick={() => dispatch({ type: 'jump', screen: 2 })}>
          {bilingual(content.scr02_shortlist.cta)}
        </Button>
      </div>
    </div>
  )
}

function DraftScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  return (
    <div>
      <div className="draft-head">
        <ScreenIntro title={content.scr03_draft.title} subtitle={content.scr03_draft.subtitle} />
        <div className="writing-chip">
          <span>{bilingual(content.scr03_draft.writingForLabel)}</span>
          <strong>{content.scr03_draft.writingForValue}</strong>
        </div>
      </div>
      <Card className="editor-card">
        <div className="editor-toolbar">
          <span>{bilingual(content.scr03_draft.editorLabel)}</span>
          <Button
            disabled={state.streamingDraft}
            onClick={() => dispatch({ type: 'startDraftStream' })}
            variant="secondary"
          >
            ✦ {bilingual(content.scr03_draft.draftItButton)}
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
            {state.streamingDraft && <TypingDots />}
          </span>
          <Button
            disabled={!state.draftText.trim()}
            onClick={() => dispatch({ type: 'jump', screen: 3 })}
          >
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
          <CoLinhAvatar
            speakingText={content.scr04_interrogation.turns[state.turn]?.question.vi ?? null}
            nextText={content.scr04_interrogation.turns[state.turn + 1]?.question.vi ?? null}
            active={state.ttsOn && !complete}
          />
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

function ProgressPips({ turn }: { turn: number }) {
  return (
    <div className="progress-pips">
      {content.scr04_interrogation.turns.map((item, index) => (
        <span
          className={index < turn ? 'done' : index === turn ? 'current' : ''}
          key={item.targetSentence}
        />
      ))}
    </div>
  )
}

function SpotlightDraft({ turn }: { turn: number }) {
  const draft = content.scr03_draft.sampleDraft
  const target = content.scr04_interrogation.turns[turn].targetSentence
  const parts = draft.split(target)

  return (
    <Card className="spotlight-card">
      <p>
        <span>{parts[0]}</span>
        <span className="spotlight-token">{target}</span>
        <span>{parts[1]}</span>
      </p>
    </Card>
  )
}

function InterrogationScreen({
  state,
  dispatch,
}: {
  state: State
  dispatch: React.Dispatch<Action>
}) {
  const complete = isDone(state)
  const turn = content.scr04_interrogation.turns[state.turn]

  return (
    <div className="interrogation-grid">
      <div>
        <Avatar state={state} complete={complete} />
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
          <Button onClick={() => dispatch({ type: 'showReveal' })}>
            {bilingual(content.scr04_interrogation.complete.cta)}
          </Button>
        </Card>
      ) : (
        <div className="interrogate-work">
          <div className="turn-row">
            <span>
              {bilingual(content.scr04_interrogation.turnLabel)} {state.turn + 1} /{' '}
              {content.scr04_interrogation.turns.length}
            </span>
            <ProgressPips turn={state.turn} />
          </div>
          <SpotlightDraft turn={state.turn} />
          <Card dark className="question-card">
            <span className="eyebrow">{bilingual(turn.promptLabel)}</span>
            <h1>{turn.question.vi}</h1>
            <p>{turn.question.en}</p>
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
              <Button onClick={() => dispatch({ type: 'submitAnswer' })}>
                {state.turn === content.scr04_interrogation.turns.length - 1
                  ? bilingual(content.scr04_interrogation.finishButton)
                  : bilingual(content.scr04_interrogation.submitButton)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function RevealScreen({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  if (state.generating || !state.revealed) {
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
          <span>{bilingual(content.scr05_reveal.framing.from)}</span>
          <strong>→</strong>
          <em>{bilingual(content.scr05_reveal.framing.to)}</em>
        </div>
      </Card>
      <div className="before-after-grid">
        <Card className="essay-card before">
          <span className="essay-label">
            <i />
            {bilingual(content.scr05_reveal.beforeLabel)}
          </span>
          <p>{content.scr05_reveal.beforeText}</p>
        </Card>
        <Card className="essay-card after">
          <span className="essay-label">
            <i />
            {bilingual(content.scr05_reveal.afterLabel)}
          </span>
          <p>
            <DiffText text={content.scr05_reveal.afterText} />
          </p>
        </Card>
      </div>
      <section>
        <h2 className="why-title">{bilingual(content.scr05_reveal.whyHeading)}</h2>
        <div className="why-grid">
          {content.scr05_reveal.whyNotes.map((note) => (
            <Card className="why-card" key={note.quote}>
              <strong>{note.quote}</strong>
              <p>{note.why}</p>
              <span>↑ {bilingual(note.from)}</span>
            </Card>
          ))}
        </div>
      </section>
      <div className="footer-action reveal-actions">
        <Button variant="dark">{bilingual(content.scr05_reveal.actions.export)}</Button>
        <Button onClick={() => dispatch({ type: 'pushFurther' })} variant="secondary">
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

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const sampleDraft = content.scr03_draft.sampleDraft

  useEffect(() => {
    if (!state.typing) {
      return
    }
    const timeout = window.setTimeout(() => dispatch({ type: 'finishTyping' }), 900)
    return () => window.clearTimeout(timeout)
  }, [state.typing])

  useEffect(() => {
    if (!state.streamingDraft) {
      return
    }
    let index = 0
    const words = sampleDraft.split(' ')
    const interval = window.setInterval(() => {
      index += 1
      dispatch({
        type: 'draftStreamTick',
        value: words.slice(0, index).join(' '),
        done: index >= words.length,
      })
      if (index >= words.length) {
        window.clearInterval(interval)
      }
    }, 75)
    return () => window.clearInterval(interval)
  }, [sampleDraft, state.streamingDraft])

  useEffect(() => {
    if (!state.generating) {
      return
    }
    const timeout = window.setTimeout(() => dispatch({ type: 'finishReveal' }), 2000)
    return () => window.clearTimeout(timeout)
  }, [state.generating])

  const screen = useMemo(() => {
    switch (state.screen) {
      case 0:
        return <IntakeScreen dispatch={dispatch} state={state} />
      case 1:
        return <ShortlistScreen dispatch={dispatch} />
      case 2:
        return <DraftScreen dispatch={dispatch} state={state} />
      case 3:
        return <InterrogationScreen dispatch={dispatch} state={state} />
      case 4:
        return <RevealScreen dispatch={dispatch} state={state} />
      default:
        return null
    }
  }, [state])

  return (
    <Shell dispatch={dispatch} state={state}>
      {screen}
    </Shell>
  )
}

export default App
