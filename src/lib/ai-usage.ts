import { supabaseAdmin } from '@/lib/automations/admin-client'

export type AIUsageAction =
  | 'chat_response'
  | 'image_analysis'
  | 'voice_transcription'
  | 'document_summary'
  | 'flow_execution'

export interface LogAIUsageParams {
  businessId: string
  action: AIUsageAction
  model?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  latencyMs?: number
  creditsUsed?: number
  success?: boolean
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Record one row in ai_usage_logs so the super admin "AI Usage Analytics"
 * page shows real figures. Best-effort: never throws, so AI replies are
 * never blocked or delayed by telemetry failures.
 */
export async function logAIUsage(params: LogAIUsageParams): Promise<void> {
  try {
    await supabaseAdmin()
      .from('ai_usage_logs')
      .insert({
        business_id: params.businessId,
        action: params.action,
        model: params.model ?? 'gemini-2.5-flash',
        input_tokens: params.inputTokens ?? 0,
        output_tokens: params.outputTokens ?? 0,
        total_tokens: params.totalTokens ?? 0,
        latency_ms: params.latencyMs ?? 0,
        credits_used: params.creditsUsed ?? 0,
        success: params.success ?? true,
        error_message: params.errorMessage ?? null,
        metadata: params.metadata ?? {},
      })
  } catch (err) {
    console.error('[ai-usage] Failed to record AI usage:', err)
  }
}
