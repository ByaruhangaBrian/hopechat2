import { supabaseAdmin } from '@/lib/automations/admin-client'
import { engineSendText, engineSendInteractive } from '@/lib/automations/meta-send'
import { consumeCredits } from '@/lib/credits'
import { getSessionTimeoutHours } from '@/lib/tests/settings'

interface TestIntroField {
  key: string
  label: string
  type: 'text' | 'choice'
  options?: string[]
}

interface TestQuestionRow {
  id: string
  question: string
  options: Array<{ key: string; label: string }>
  correct_answer: string
  points?: number
  position?: number
}

interface TestSessionState {
  module: 'test'
  status: 'active' | 'completed'
  test_id: string
  /** present when the session arrived here via entry-test routing */
  entry_test_id?: string | null
  /** present when the session arrived here via a routing flow */
  flow_id?: string | null
  /** routing answers collected by the flow that led here */
  flow_answers?: Record<string, string>
  stage: 'intro' | 'question'
  index: number
  /** consecutive un-answerable replies (audio, gibberish) — throttles re-prompts */
  invalid_replies?: number
  intro_answers: Record<string, string>[]
  current_score: number
  answered: Array<{ question_id: string; selected: string; correct: boolean; points: number }>
  started_at: string
  conversation_id: string
  user_id: string
  business_id: string
}

interface FlowStepRow {
  id: string
  flow_id: string
  key: string
  prompt: string
  step_type: 'choice' | 'text'
  options: Array<{ label: string; next_step_id?: string | null; test_id?: string | null }>
  next_step_id?: string | null
  test_id?: string | null
  position?: number
}

interface FlowState {
  module: 'flow'
  status: 'active'
  flow_id: string
  step_id: string
  answers: Record<string, string>
  conversation_id: string
  user_id: string
  business_id: string
  started_at: string
}

function sortQuestions(rows: TestQuestionRow[]): TestQuestionRow[] {
  return [...(rows || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function introFieldsOf(test: { intro_fields?: unknown }): TestIntroField[] {
  return Array.isArray(test.intro_fields) ? (test.intro_fields as TestIntroField[]) : []
}

/** A timed exam: mode 'test' with a duration. Practice tests are exempt. */
function isTimedTest(test: { mode?: string; duration_minutes?: number | null } | null | undefined): boolean {
  return test?.mode === 'test' && !!test.duration_minutes
}

/**
 * Attempt guard: a timed exam may be finished only once per phone number.
 * Only COMPLETED attempts count — a student who abandons before finishing can
 * retry — so this checks the `test_attempts` history, not the live session.
 */
async function hasFinishedAttempt(contactId: string, testId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from('test_attempts')
    .select('id')
    .eq('contact_id', contactId)
    .eq('test_id', testId)
    .limit(1)
    .maybeSingle()
  return !!data
}

function attemptLimitMessage(title: string): string {
  return `You have already taken "${title}". Each phone number can attempt this test only once.`
}

/**
 * True when `test` is a timed exam the contact has already finished; in that
 * case the caller must not start it (a notice is sent by the caller).
 */
async function isAttemptBlocked(
  contactId: string,
  test: { id: string; mode?: string; duration_minutes?: number | null },
): Promise<boolean> {
  if (!isTimedTest(test)) return false
  return hasFinishedAttempt(contactId, test.id)
}

/**
 * True when an active session has gone quiet for longer than the business's
 * configured inactivity window. Timed tests are exempt — their own duration
 * deadline governs them (see the per-reply deadline check in handleTestReply).
 */
async function isInactiveExpired(
  businessId: string,
  lastActivityAt: string | null | undefined,
  test: { mode?: string; duration_minutes?: number | null } | null,
): Promise<boolean> {
  if (test?.mode === 'test' && test.duration_minutes) return false
  const timeoutHours = await getSessionTimeoutHours(businessId)
  const last = lastActivityAt ? new Date(lastActivityAt).getTime() : Date.now()
  return Date.now() - last > timeoutHours * 60 * 60 * 1000
}

/** Send an interactive buttons/list payload scoped to a conversation. */
async function sendInteractive(
  userId: string,
  conversationId: string,
  contactId: string,
  body: string,
  items: Array<{ id: string; label: string }>,
): Promise<void> {
  const isButtons = items.length <= 3
  const maxChars = isButtons ? 20 : 24
  await engineSendInteractive({
    userId,
    conversationId,
    contactId,
    body,
    items: items.slice(0, 10).map((it) => ({ id: it.id, label: it.label.slice(0, maxChars) })),
  })
}

async function sendIntroQuestion(
  userId: string,
  conversationId: string,
  contactId: string,
  field: TestIntroField,
): Promise<void> {
  if (field.type === 'choice' && field.options && field.options.length > 0) {
    return sendInteractive(
      userId,
      conversationId,
      contactId,
      field.label,
      field.options.map((opt) => ({ id: `${field.key}:${opt}`, label: opt })),
    )
  }
  await engineSendText({ userId, conversationId, contactId, text: field.label })
}

function sendTestQuestion(
  userId: string,
  conversationId: string,
  contactId: string,
  question: TestQuestionRow,
): Promise<void> {
  const options = (question.options || []).filter((o) => o && o.key)
  return sendInteractive(
    userId,
    conversationId,
    contactId,
question.question,
    options.map((o) => ({ id: `${question.id}:${o.key}`, label: o.label })),
  )
}

function normalize(s: string): string {
  return String(s ?? '').trim().toLowerCase()
}

/**
 * Guardrail helpers for messages a student sends that are NOT a valid answer:
 * audio notes, attachments, empty text, gibberish, or a typed label that
 * doesn't match any option. We nudge back with the exact instruction instead of
 * recording the bad input as an answer and advancing the test.
 */

async function nudgeAndReaskIntro(
  contactId: string,
  state: TestSessionState,
  field: TestIntroField,
  nudges: number,
): Promise<void> {
  const { user_id, conversation_id } = state
  const text =
    field.type === 'choice' && field.options?.length
      ? `I didn't get that. Please answer with one of: ${(field.options || []).join(' / ')}.`
      : "I didn't get that. Please type your answer as text."
  await engineSendText({ userId: user_id, conversationId: conversation_id, contactId, text })
  if (nudges < 3) {
    await sendIntroQuestion(user_id, conversation_id, contactId, field)
  }
}

async function nudgeAndReaskQuestion(
  contactId: string,
  state: TestSessionState,
  question: TestQuestionRow,
  nudges: number,
): Promise<void> {
  const { user_id, conversation_id } = state
  const options = (question.options || []).filter((o) => o && o.key).map((o) => o.label)
  const text = options.length
    ? `I didn't get that. Please answer with one of: ${options.join(' / ')}.`
    : "I didn't get that. Please type your answer as text."
  await engineSendText({ userId: user_id, conversationId: conversation_id, contactId, text })
  if (nudges < 3) {
    await sendTestQuestion(user_id, conversation_id, contactId, question)
  }
}

/**
 * Start a test/practice session for a contact.
 *
 * Idempotent: if the contact already has an ACTIVE test session, this is a
 * no-op. That guard stops `dispatch_test` automation steps with a
 * `new_message_received` trigger from re-starting (and resetting) the test on
 * every single inbound reply.
 */
export async function startTest(contactId: string, testId: string): Promise<void> {
  const db = supabaseAdmin()

  const { data: test, error: testErr } = await db
    .from('tests')
    .select('*, test_questions(*)')
    .eq('id', testId)
    .eq('is_active', true)
    .single()
  if (testErr || !test) throw new Error('Test not found or inactive')

// Idempotency guard — never reset a session that is mid-flow. A stale
  // *inactive* session is treated as done so a hung session never blocks a
  // fresh dispatch from ever starting.
  const { data: existing } = await db
    .from('user_sessions')
    .select('session_data, last_interaction_at')
    .eq('business_id', test.business_id)
    .eq('contact_id', contactId)
    .maybeSingle()
  const esd = existing?.session_data as TestSessionState | null | undefined
  if (esd?.module === 'test' && esd?.status === 'active') {
    const expired = await isInactiveExpired(
      test.business_id,
      (existing as { last_interaction_at?: string } | null)?.last_interaction_at ?? esd.started_at,
      test,
    )
    if (!expired) return
  }

  await beginSession(contactId, test)
}

async function resolveUserAndConversation(businessId: string, contactId: string): Promise<{ userId: string; conversationId: string }> {
  const db = supabaseAdmin()
  const { data: config } = await db
    .from('whatsapp_config')
    .select('user_id')
    .eq('business_id', businessId)
    .single()
  if (!config?.user_id) throw new Error('WhatsApp not configured')

  let { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('contact_id', contactId)
    .maybeSingle()
  if (!conv) {
    const { data: newConv } = await db
      .from('conversations')
      .insert({
        user_id: config.user_id,
        business_id: businessId,
        contact_id: contactId,
        ai_enabled: true,
      })
      .select('id')
      .single()
    conv = newConv
  }
  if (!conv?.id) throw new Error('could not resolve conversation')
  return { userId: config.user_id, conversationId: conv.id }
}

/**
 * Seed a fresh session for `test` and send its first prompt (a start message,
 * then intro fields one-by-one, then questions one-by-one).
 */
async function beginSession(
  contactId: string,
  test: { id: string; business_id: string; title: string; start_message?: string | null; intro_fields?: unknown; test_questions?: unknown; mode?: string; duration_minutes?: number | null },
  opts: {
    entry_test_id?: string | null
    intro_answers?: Record<string, string>[]
    flow_id?: string | null
    flow_answers?: Record<string, string>
  } = {},
): Promise<void> {
  const db = supabaseAdmin()
  const questions = sortQuestions((test.test_questions ?? []) as TestQuestionRow[])
  const introFields = introFieldsOf(test)

  if (introFields.length === 0 && questions.length === 0) {
    throw new Error('Test has no questions or intro fields')
  }

  const { userId, conversationId } = await resolveUserAndConversation(test.business_id, contactId)

  // Timed exams are once per phone number (based on completed attempts).
  if (await isAttemptBlocked(contactId, test)) {
    await engineSendText({ userId, conversationId, contactId, text: attemptLimitMessage(test.title) })
    return
  }

  const state: TestSessionState = {
    module: 'test',
    status: 'active',
    test_id: test.id,
    entry_test_id: opts.entry_test_id ?? null,
    flow_id: opts.flow_id ?? null,
    flow_answers: opts.flow_answers ?? {},
    stage: introFields.length > 0 ? 'intro' : 'question',
    index: 0,
    intro_answers: opts.intro_answers ?? [],
    current_score: 0,
    answered: [],
    started_at: new Date().toISOString(),
    conversation_id: conversationId,
    user_id: userId,
    business_id: test.business_id,
  }

await db.from('user_sessions').upsert(
    {
      business_id: test.business_id,
      contact_id: contactId,
      current_node_id: null,
      quiz_score: 0,
      session_data: state,
      last_interaction_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,contact_id' },
  )

  if (test.start_message) {
    await engineSendText({
      userId,
      conversationId,
      contactId,
      text: test.start_message,
    })
  }

  if (introFields.length > 0) {
    await sendIntroQuestion(userId, conversationId, contactId, introFields[0])
  } else if (questions.length > 0) {
    await sendTestQuestion(userId, conversationId, contactId, questions[0])
  }
}

export interface TestReplyResult {
  handled: boolean
}

/**
 * Handle a contact's reply to an active test/practice session.
 *
 * Flow:
 *  - intro fields → collect answers; on the last one, either start questions
 *    (normal test) or ROUTE to the matching target test (entry test).
 *  - questions → grade, advance, score, then a final summary + restart/done.
 */
export async function handleTestReply(
  contactId: string,
  selectedOptionKey: string | null,
  messageText: string,
): Promise<TestReplyResult> {
  const db = supabaseAdmin()

  const { data: session } = await db
    .from('user_sessions')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle()

const state = session?.session_data as TestSessionState | null | undefined
  if (!state || state.module !== 'test') return { handled: false }

  // Coalesce concurrent webhook deliveries: claim this reply by CAS-ing
  // last_interaction_at against the value we just read. Only the winning
  // request proceeds; competitors are swallowed so rapid double-taps sent as
  // two overlapping webhook payloads can never send two questions at once,
  // double-advance the session, or double-finish a timed test.
  const nowTs = new Date().toISOString()
  const { data: claimed } = await db
    .from('user_sessions')
    .update({ last_interaction_at: nowTs })
    .eq('contact_id', contactId)
    .eq('last_interaction_at', session.last_interaction_at)
    .select('id')
    .maybeSingle()
  if (!claimed) return { handled: true }

// A completed session only accepts two buttons: "Start over" (re-runs the
  // screening it came through — routing flow, entry test, or nothing) and
  // "Done" (permanently closes the session so nothing can restart it).
  if (state.status === 'completed') {
    if (selectedOptionKey === 'test:restart') {
      if (state.flow_id) await startFlow(contactId, state.flow_id)
      else await startTest(contactId, state.entry_test_id || state.test_id)
      return { handled: true }
    }
    if (selectedOptionKey === 'test:done') {
      await db.from('user_sessions').delete().eq('contact_id', contactId)
      return { handled: true }
    }
    return { handled: false }
  }

  const { data: test } = await db
    .from('tests')
    .select('*, test_questions(*)')
    .eq('id', state.test_id)
    .single()
  if (!test) return { handled: false }

  // Inactivity timeout: discard a session idle longer than the business's
  // configured window (timed tests use their own deadline instead), so a hung
  // session never blocks a fresh dispatch forever.
  if (await isInactiveExpired(state.business_id, session?.last_interaction_at ?? state.started_at, test)) {
    await db.from('user_sessions').delete().eq('contact_id', contactId)
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: 'This session has been closed because it was idle for too long. Send a message to start a new one.',
    })
    return { handled: true }
  }

  const questions = sortQuestions(test.test_questions as TestQuestionRow[])
  const introFields = introFieldsOf(test)
  const isEntry = test.is_entry === true

  // Timed test: enforce the deadline server-side.
  if (test.mode === 'test' && test.duration_minutes) {
    const deadline = new Date(state.started_at).getTime() + test.duration_minutes * 60 * 1000
    if (Date.now() > deadline) {
      await finishTest(contactId, state, test, true)
      return { handled: true }
    }
  }

  // Extract the raw answer value from a button reply or typed text.
  const answerValue = selectedOptionKey ? selectedOptionKey.split(':').slice(1).join(':') : (messageText || '')

// --- INTRO STAGE ---
  if (state.stage === 'intro') {
    const field = introFields[state.index]

    if (field) {
      const typed = String(answerValue ?? '').trim()

      if (field.type === 'choice' && field.options?.length) {
        // Valid answer = a tapped button for THIS field, or typed text that
        // matches one of the option labels. Anything else (audio, attachment,
        // gibberish, an irrelevant tap) is re-asked — never recorded.
        const tapped = !!selectedOptionKey?.startsWith(`${field.key}:`)
        const matched = (field.options || []).find((opt) => normalize(opt) === normalize(typed))
        if (!tapped && !matched) {
          state.invalid_replies = (state.invalid_replies ?? 0) + 1
          await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
          await nudgeAndReaskIntro(contactId, state, field, state.invalid_replies)
          return { handled: true }
        }
        state.intro_answers = [...state.intro_answers, { [field.key]: matched ?? typed }]
      } else if (!typed) {
        // Text field: a tap / audio / empty reply is not an answer.
        state.invalid_replies = (state.invalid_replies ?? 0) + 1
        await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
        await nudgeAndReaskIntro(contactId, state, field, state.invalid_replies)
        return { handled: true }
      } else {
        state.intro_answers = [...state.intro_answers, { [field.key]: typed.slice(0, 500) }]
      }

      state.invalid_replies = 0
      state.index++
    }

    if (state.index >= introFields.length) {
      state.stage = 'question'
      state.index = 0
    }

    // Entry test: the last intro answer triggers routing to the matching test.
    if (state.stage === 'question' && (isEntry || questions.length === 0)) {
      await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
      await routeToTest(contactId, state, test, introFields)
      return { handled: true }
    }

    await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)

    if (state.stage === 'question') {
      await sendTestQuestion(state.user_id, state.conversation_id, contactId, questions[0])
    } else {
      await sendIntroQuestion(state.user_id, state.conversation_id, contactId, introFields[state.index])
    }
    return { handled: true }
  }

  // --- QUESTION STAGE ---
  if (state.index >= questions.length) {
    // All questions answered; ignore late replies.
    return { handled: true }
  }

  const current = questions[state.index]
  const hasOptions = (current.options || []).some((o) => o && o.key)

  // Choice questions must receive a tapped button or a typed option label
  // (matched case-insensitively and recorded as the option key so grading and
  // feedback stay correct). Audio / empty / unrelated text is re-asked.
  let finalAnswer = answerValue
  if (hasOptions) {
    const typed = String(answerValue ?? '').trim()
    const tapped = !!selectedOptionKey?.startsWith(`${current.id}:`)
    const matched = (current.options || []).find((o) => o && o.key && normalize(o.label) === normalize(typed))
    if (!tapped && !matched) {
      state.invalid_replies = (state.invalid_replies ?? 0) + 1
      await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
      await nudgeAndReaskQuestion(contactId, state, current, state.invalid_replies)
      return { handled: true }
    }
    finalAnswer = tapped ? typed : matched!.key
  }

  const correct = !!current.correct_answer && finalAnswer === current.correct_answer
  const earned = correct ? (current.points && current.points > 0 ? current.points : 1) : 0

  state.current_score += earned
  state.invalid_replies = 0
  state.answered = [...state.answered, { question_id: current.id, selected: finalAnswer, correct, points: earned }]
  state.index++

  await db
    .from('user_sessions')
    .update({ session_data: state, quiz_score: state.current_score })
    .eq('contact_id', contactId)

  // Practice mode reveals the answer inline; test mode stays silent.
  if (test.mode === 'practice') {
    const body = correct ? 'Correct!' : `Incorrect. The correct answer is ${answerLabel(current)}.`
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: body,
    })
  }

  if (state.index >= questions.length) {
    await finishTest(contactId, state, test, false)
    return { handled: true }
  }

  await sendTestQuestion(state.user_id, state.conversation_id, contactId, questions[state.index])
  return { handled: true }
}

/**
 * Route an entry-test's collected intro answers to a matching target test.
 * Each target test declares `route_rules: { fieldKey: value }`; a target is
 * chosen when EVERY rule matches an intro answer.
 */
async function routeToTest(
  contactId: string,
  state: TestSessionState,
  entryTest: any,
  introFields: TestIntroField[],
): Promise<void> {
  const db = supabaseAdmin()

  const answersObj: Record<string, string> = {}
  for (const item of state.intro_answers) {
    for (const [k, v] of Object.entries(item)) answersObj[k] = v
  }

  const { data: candidates, error } = await db
    .from('tests')
    .select('*, test_questions(*)')
    .eq('business_id', state.business_id)
    .eq('is_active', true)
    .not('route_rules', 'is', null)
    .neq('id', entryTest.id)

  if (error) {
    console.error('[tests/runtime] route lookup error:', error)
  }

  const target = (candidates || []).find((t) => {
    const rules = (t.route_rules || {}) as Record<string, string>
    const matches = (wanted: string, given: string) =>
      String(wanted).trim().toLowerCase() === String(given ?? '').trim().toLowerCase()
    return (
      Object.keys(rules).length > 0 && Object.entries(rules).every(([k, v]) => matches(v, answersObj[k]))
    )
  })

  if (!target) {
    const summary = state.intro_answers.map((a) => Object.values(a)[0] ?? '').join(', ') || 'your selections'
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: `Sorry, we couldn't find a test matching ${summary}. Please start over.`,
    })
    // Re-ask the screening from the top.
    state.stage = 'intro'
    state.index = 0
    state.intro_answers = []
    await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
    if (introFields[0]) {
      await sendIntroQuestion(state.user_id, state.conversation_id, contactId, introFields[0])
    }
    return
  }

  // A timed exam the student already finished can't be re-routed into.
  if (await isAttemptBlocked(contactId, target)) {
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: attemptLimitMessage(target.title),
    })
    return
  }

  await engineSendText({
    userId: state.user_id,
    conversationId: state.conversation_id,
    contactId,
    text: `Starting ${target.title}…`,
  })

  // Hand the session to the target test (its own intro fields, if any, then
  // questions). Keep the screening answers for the record and remember the
  // entry test so "Start over" re-runs the full screening.
  await beginSession(contactId, target, {
    entry_test_id: entryTest.id,
    intro_answers: state.intro_answers,
  })
}

function answerLabel(question: TestQuestionRow): string {
  const hit = (question.options || []).find((o) => o.key === question.correct_answer)
  return hit ? hit.label : String(question.correct_answer || '')
}

/** Final score message + Start over / Done buttons; marks the session complete. */
async function finishTest(
  contactId: string,
  state: TestSessionState,
  test: any,
  timedOut: boolean,
): Promise<void> {
  const db = supabaseAdmin()
  const questions = sortQuestions((test.test_questions || []) as TestQuestionRow[])
  const totalPossible = questions.reduce((sum, q) => sum + (q.points && q.points > 0 ? q.points : 1), 0)
  const correctCount = state.answered.filter((a) => a.correct).length
  const percentage = totalPossible > 0 ? Math.round((state.current_score / totalPossible) * 100) : 0
  const passMark = Number(test.pass_mark || 0)
  const passed = percentage >= passMark

  let body = timedOut
    ? `Time's up!\n\nFinal score: ${state.current_score}/${totalPossible} (${percentage}%).`
    : `Test complete!\n\nScore: ${state.current_score}/${totalPossible} (${percentage}%).`
  body += `\nCorrect: ${correctCount} | Incorrect: ${state.answered.length - correctCount}.`
  if (passMark > 0) {
    body += `\nPass mark: ${passMark}% — You ${passed ? 'PASSED' : 'DID NOT PASS'}.`
  }
  if (test.mode === 'test' && state.started_at) {
    const elapsed = Math.round((Date.now() - new Date(state.started_at).getTime()) / 60000)
    body += `\nTime used: ${elapsed} minute(s).`
  }

  // Timed exams can't be retaken, so offer only "Done"; practice/unlimited
  // tests keep the "Start over" option.
  const endButtons = isTimedTest(test)
    ? [{ id: 'test:done', label: 'Done' }]
    : [
        { id: 'test:restart', label: 'Start over' },
        { id: 'test:done', label: 'Done' },
      ]

  await sendInteractive(state.user_id, state.conversation_id, contactId, body, endButtons)

  await persistAttempt(contactId, state, test, questions, percentage, passed, correctCount, totalPossible, timedOut)

  await db
    .from('user_sessions')
    .update({
      current_node_id: null,
      quiz_score: state.current_score,
      session_data: { ...state, status: 'completed' },
    })
    .eq('contact_id', contactId)
}

/** Write the finished attempt + per-question results for the admin dashboard. */
async function persistAttempt(
  contactId: string,
  state: TestSessionState,
  test: any,
  questions: TestQuestionRow[],
  percentage: number,
  passed: boolean,
  correctCount: number,
  totalPossible: number,
  timedOut: boolean,
): Promise<void> {
  const db = supabaseAdmin()

  const routingAnswers: Record<string, string> = {}
  if (state.flow_answers) Object.assign(routingAnswers, state.flow_answers)
  for (const item of state.intro_answers || []) {
    for (const [k, v] of Object.entries(item)) if (!routingAnswers[k]) routingAnswers[k] = v
  }

  const { data: attempt, error } = await db
    .from('test_attempts')
    .insert({
      business_id: state.business_id,
      user_id: state.user_id,
      contact_id: contactId,
      conversation_id: state.conversation_id,
      test_id: test.id,
      mode: test.mode,
      routing_answers: routingAnswers,
      score: state.current_score,
      total: totalPossible,
      percentage,
      correct_count: correctCount,
      passed: Number(test.pass_mark || 0) > 0 ? passed : null,
      timed_out: timedOut,
      started_at: state.started_at,
      finished_at: new Date().toISOString(),
    })
    .select('id')
    .single()

if (error || !attempt) {
    console.error('[tests/runtime] persist attempt error:', error?.message || 'no attempt id')
    return
  }

  // Credit usage: a completed attempt costs the business 1 credit (the amount
  // is configured in the super admin Credit System Configuration).
  const credit = await consumeCredits(state.business_id, 'test_attempt', {
    userId: state.user_id,
    contactId,
    referenceId: `test_attempt:${attempt.id}`,
    description: `Test attempt: ${test.title}`,
    metadata: { test_id: test.id, mode: test.mode },
  })
  if (!credit.ok) {
    console.warn(`[tests/runtime] credit deduction failed for business ${state.business_id}:`, credit.reason)
  }

  const rows = state.answered.map((a, i) => {
    const q = questions.find((qq) => qq.id === a.question_id)
    return {
      attempt_id: attempt.id,
      test_id: test.id,
      contact_id: contactId,
      question_id: a.question_id,
      question_text: q?.question ?? `#${i + 1}`,
      selected: a.selected || null,
      correct: a.correct,
      points: a.points,
    }
  })
  if (rows.length > 0) {
    const { error: qErr } = await db.from('test_question_results').insert(rows)
    if (qErr) console.error('[tests/runtime] persist question results error:', qErr.message)
  }
}
/* ------------------------------------------------------------------ */
/*  Routing flows (decision-tree screening: class -> subject -> paper)  */
/* ------------------------------------------------------------------ */

function sortFlowSteps(rows: FlowStepRow[]): FlowStepRow[] {
  return [...(rows || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

async function loadFlow(flowId: string, activeOnly: boolean): Promise<{ flow: any; steps: FlowStepRow[] }> {
  const db = supabaseAdmin()
  const { data: flow, error } = activeOnly
    ? await db
        .from('routing_flows')
        .select('*')
        .eq('id', flowId)
        .eq('is_active', true)
        .maybeSingle()
    : await db
        .from('routing_flows')
        .select('*')
        .eq('id', flowId)
        .maybeSingle()
  if (error || !flow) throw new Error('Routing flow not found or inactive')
  const { data: rows, error: stepsErr } = await db
    .from('routing_steps')
    .select('*')
    .eq('flow_id', flowId)
    .order('position', { ascending: true })
  if (stepsErr) throw new Error('Routing flow steps could not be loaded')
  const steps = sortFlowSteps((rows ?? []) as FlowStepRow[])
  return { flow, steps }
}

/**
 * Start a routing flow for a contact. Idempotent — like startTest, it never
 * resets a session that is already mid-flow (stops dispatch_routing_flow
 * automation steps from re-firing on every inbound reply).
 */
export async function startFlow(contactId: string, flowId: string): Promise<void> {
  const db = supabaseAdmin()
  const { flow, steps } = await loadFlow(flowId, true)
  const entry = steps.find((s) => s.id === flow.entry_step_id)
  if (!entry) throw new Error('Routing flow has no entry step')

const { data: existing } = await db
    .from('user_sessions')
    .select('session_data, last_interaction_at')
    .eq('business_id', flow.business_id)
    .eq('contact_id', contactId)
    .maybeSingle()
  const esd = existing?.session_data as FlowState | TestSessionState | null | undefined
  if (esd?.module && esd.status === 'active') {
    const expired = await isInactiveExpired(
      flow.business_id,
      (existing as { last_interaction_at?: string } | null)?.last_interaction_at ?? esd.started_at,
      null,
    )
    if (!expired) return
  }

  const { userId, conversationId } = await resolveUserAndConversation(flow.business_id, contactId)

  const state: FlowState = {
    module: 'flow',
    status: 'active',
    flow_id: flow.id,
    step_id: entry.id,
    answers: {},
    conversation_id: conversationId,
    user_id: userId,
    business_id: flow.business_id,
    started_at: new Date().toISOString(),
  }

await db.from('user_sessions').upsert(
    {
      business_id: flow.business_id,
      contact_id: contactId,
      current_node_id: null,
      quiz_score: 0,
      session_data: state,
      last_interaction_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,contact_id' },
  )

  await askStepOrAdvance(contactId, state, flow, steps, entry.id)
}

/**
 * Ask the given step's question, auto-advancing through choice steps that
 * only have a single option (a level that isn't needed on this branch).
 */
async function askStepOrAdvance(
  contactId: string,
  state: FlowState,
  flow: any,
  steps: FlowStepRow[],
  stepId: string,
): Promise<void> {
  const db = supabaseAdmin()
  const step = steps.find((s) => s.id === stepId)
  if (!step) {
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: 'Sorry, this screening is incomplete. Please try again later.',
    })
    return
  }

  state.step_id = step.id
  await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)

  if (step.step_type === 'text') {
    await engineSendText({ userId: state.user_id, conversationId: state.conversation_id, contactId, text: step.prompt })
    return
  }

  const options = step.options || []
  if (options.length === 0) {
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: 'Sorry, this screening has no options. Please try again later.',
    })
    return
  }
  if (options.length === 1) {
    // auto-skip: only one path exists, so the level is unnecessary
    state.answers[step.key] = options[0].label
    await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
    await followFlowTarget(contactId, state, flow, steps, options[0])
    return
  }

  await sendInteractive(
    state.user_id,
    state.conversation_id,
    contactId,
    step.prompt,
    options.map((o, i) => ({ id: `${step.id}:${i}`, label: o.label })),
  )
}

/** Follow an option's target (a next step or a test) reached by a flow. */
async function followFlowTarget(
  contactId: string,
  state: FlowState,
  flow: any,
  steps: FlowStepRow[],
  target: { next_step_id?: string | null; test_id?: string | null },
): Promise<void> {
  if (target.test_id) {
    const db = supabaseAdmin()
    const { data: test } = await db
      .from('tests')
      .select('*, test_questions(*)')
      .eq('id', target.test_id)
      .eq('is_active', true)
      .single()
    if (!test) {
      await engineSendText({
        userId: state.user_id,
        conversationId: state.conversation_id,
        contactId,
        text: 'Sorry, that paper is not available right now. Please try again later.',
      })
      return
    }
    // A timed exam the student already finished can't be re-routed into.
    if (await isAttemptBlocked(contactId, test)) {
      await engineSendText({
        userId: state.user_id,
        conversationId: state.conversation_id,
        contactId,
        text: attemptLimitMessage(test.title),
      })
      return
    }
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: `Starting ${test.title}…`,
    })
    await beginSession(contactId, test, { flow_id: flow.id, flow_answers: state.answers })
    return
  }
  if (target.next_step_id) {
    await askStepOrAdvance(contactId, state, flow, steps, target.next_step_id)
    return
  }
  await engineSendText({
    userId: state.user_id,
    conversationId: state.conversation_id,
    contactId,
    text: 'Sorry, this screening is incomplete. Please try again later.',
  })
}

/**
 * Handle a contact's reply to an active routing-flow session.
 */
export async function handleFlowReply(
  contactId: string,
  selectedOptionKey: string | null,
  messageText: string,
): Promise<TestReplyResult> {
  const db = supabaseAdmin()

  const { data: session } = await db
    .from('user_sessions')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle()
const state = session?.session_data as FlowState | null | undefined
  if (!state || state.module !== 'flow' || state.status !== 'active') return { handled: false }

  // Claim this reply (CAS on last_interaction_at) so overlapping webhook
  // deliveries for the same contact can't both advance the flow.
  const nowTs = new Date().toISOString()
  const { data: claimed } = await db
    .from('user_sessions')
    .update({ last_interaction_at: nowTs })
    .eq('contact_id', contactId)
    .eq('last_interaction_at', session.last_interaction_at)
    .select('id')
    .maybeSingle()
  if (!claimed) return { handled: true }

  // Inactivity timeout — same window as tests (flows are always untimed).
  if (await isInactiveExpired(state.business_id, session?.last_interaction_at ?? state.started_at, null)) {
    await db.from('user_sessions').delete().eq('contact_id', contactId)
    await engineSendText({
      userId: state.user_id,
      conversationId: state.conversation_id,
      contactId,
      text: 'This session has been closed because it was idle for too long. Send a message to start a new one.',
    })
    return { handled: true }
  }

  let flow: any
  let steps: FlowStepRow[]
  try {
    const loaded = await loadFlow(state.flow_id, false)
    flow = loaded.flow
    steps = loaded.steps
  } catch {
    return { handled: false }
  }

  const step = steps.find((s) => s.id === state.step_id)
  if (!step) return { handled: false }

  if (step.step_type === 'text') {
    const value =
      (selectedOptionKey ? selectedOptionKey.split(':').slice(1).join(':') : (messageText || '')).trim()
    if (!value) {
      await engineSendText({
        userId: state.user_id,
        conversationId: state.conversation_id,
        contactId,
        text: step.prompt,
      })
      return { handled: true }
    }
    state.answers[step.key] = value
    await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
    await followFlowTarget(contactId, state, flow, steps, {
      next_step_id: step.next_step_id,
      test_id: step.test_id,
    })
    return { handled: true }
  }

// choice: option buttons are id `${stepId}:${index}`; typed option labels are
  // also accepted (case-insensitively). Audio / empty text re-asks the step.
  const parts = (selectedOptionKey || '').split(':')
  const idx = parts.length >= 2 ? Number(parts[parts.length - 1]) : NaN
  const tapped = !Number.isNaN(idx) ? (step.options || [])[idx] : undefined
  const typedMatch = tapped ? undefined : (step.options || []).find((o) => normalize(o.label) === normalize(messageText ?? ''))
  const option = tapped ?? typedMatch
  if (!option) {
    await askStepOrAdvance(contactId, state, flow, steps, step.id)
    return { handled: true }
  }
  state.answers[step.key] = option.label
  await db.from('user_sessions').update({ session_data: state }).eq('contact_id', contactId)
  await followFlowTarget(contactId, state, flow, steps, option)
  return { handled: true }
}
