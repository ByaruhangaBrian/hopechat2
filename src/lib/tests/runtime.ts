import { supabaseAdmin } from '@/lib/automations/admin-client'
import { engineSendText, engineSendInteractive } from '@/lib/automations/meta-send'

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
  stage: 'intro' | 'question'
  index: number
  intro_answers: Record<string, string>[]
  current_score: number
  answered: Array<{ question_id: string; correct: boolean; points: number }>
  started_at: string
  conversation_id: string
  user_id: string
  business_id: string
}

function sortQuestions(rows: TestQuestionRow[]): TestQuestionRow[] {
  return [...(rows || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function introFieldsOf(test: { intro_fields?: unknown }): TestIntroField[] {
  return Array.isArray(test.intro_fields) ? (test.intro_fields as TestIntroField[]) : []
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

  // Idempotency guard — never reset a session that is mid-flow.
  const { data: existing } = await db
    .from('user_sessions')
    .select('session_data')
    .eq('business_id', test.business_id)
    .eq('contact_id', contactId)
    .maybeSingle()
  const esd = existing?.session_data as TestSessionState | null | undefined
  if (esd?.module === 'test' && esd?.status === 'active') return

  await beginSession(contactId, test)
}

/**
 * Seed a fresh session for `test` and send its first prompt (a start message,
 * then intro fields one-by-one, then questions one-by-one).
 */
async function beginSession(
  contactId: string,
  test: { id: string; business_id: string; title: string; start_message?: string | null; intro_fields?: unknown },
  opts: { entry_test_id?: string | null; intro_answers?: Record<string, string>[] } = {},
): Promise<void> {
  const db = supabaseAdmin()
  const questions = sortQuestions((test as any).test_questions as TestQuestionRow[] | undefined ?? [])
  const introFields = introFieldsOf(test)

  if (introFields.length === 0 && questions.length === 0) {
    throw new Error('Test has no questions or intro fields')
  }

  const { data: config } = await db
    .from('whatsapp_config')
    .select('user_id')
    .eq('business_id', test.business_id)
    .single()
  if (!config?.user_id) throw new Error('WhatsApp not configured')

  let { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', test.business_id)
    .eq('contact_id', contactId)
    .maybeSingle()
  if (!conv) {
    const { data: newConv } = await db
      .from('conversations')
      .insert({
        user_id: config.user_id,
        business_id: test.business_id,
        contact_id: contactId,
        ai_enabled: true,
      })
      .select('id')
      .single()
    conv = newConv
  }
  const conversationId = conv?.id
  if (!conversationId) throw new Error('could not resolve conversation')

  const state: TestSessionState = {
    module: 'test',
    status: 'active',
    test_id: test.id,
    entry_test_id: opts.entry_test_id ?? null,
    stage: introFields.length > 0 ? 'intro' : 'question',
    index: 0,
    intro_answers: opts.intro_answers ?? [],
    current_score: 0,
    answered: [],
    started_at: new Date().toISOString(),
    conversation_id: conversationId,
    user_id: config.user_id,
    business_id: test.business_id,
  }

  await db.from('user_sessions').upsert(
    {
      business_id: test.business_id,
      contact_id: contactId,
      current_node_id: null,
      quiz_score: 0,
      session_data: state,
    },
    { onConflict: 'business_id,contact_id' },
  )

  if (test.start_message) {
    await engineSendText({
      userId: config.user_id,
      conversationId,
      contactId,
      text: test.start_message,
    })
  }

  if (introFields.length > 0) {
    await sendIntroQuestion(config.user_id, conversationId, contactId, introFields[0])
  } else if (questions.length > 0) {
    await sendTestQuestion(config.user_id, conversationId, contactId, questions[0])
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

  // A completed session only accepts the "Start over" button (re-runs the
  // entry screening when the session was reached via routing).
  if (state.status === 'completed') {
    if (selectedOptionKey === 'test:restart') {
      await startTest(contactId, state.entry_test_id || state.test_id)
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
      state.intro_answers = [...state.intro_answers, { [field.key]: answerValue }]
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
  const correct = !!current.correct_answer && answerValue === current.correct_answer
  const earned = correct ? (current.points && current.points > 0 ? current.points : 1) : 0

  state.current_score += earned
  state.answered = [...state.answered, { question_id: current.id, correct, points: earned }]
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

  await sendInteractive(state.user_id, state.conversation_id, contactId, body, [
    { id: 'test:restart', label: 'Start over' },
    { id: 'test:done', label: 'Done' },
  ])

  await db
    .from('user_sessions')
    .update({
      current_node_id: null,
      quiz_score: state.current_score,
      session_data: { ...state, status: 'completed' },
    })
    .eq('contact_id', contactId)
}