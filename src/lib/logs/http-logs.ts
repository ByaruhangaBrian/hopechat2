import { supabaseAdmin } from '@/lib/automations/admin-client'

export interface LogEventArgs {
    userId?: string | null
    direction: 'incoming' | 'outgoing'
    service: string
    endpoint?: string | null
    payload?: unknown
    headers?: Record<string, unknown> | null
    statusCode?: number | null
    note?: string | null
}

export async function logHttpEvent(args: LogEventArgs) {
    try {
        const db = supabaseAdmin()
        await db.from('http_logs').insert({
            user_id: args.userId ?? null,
            direction: args.direction,
            service: args.service,
            endpoint: args.endpoint ?? null,
            payload: args.payload ?? null,
            headers: args.headers ?? null,
            status_code: args.statusCode ?? null,
            note: args.note ?? null,
        })
    } catch (err) {
        // Best-effort logging — don't throw.
        // eslint-disable-next-line no-console
        console.warn('[http_logs] failed to write log:', err instanceof Error ? err.message : err)
    }
}
