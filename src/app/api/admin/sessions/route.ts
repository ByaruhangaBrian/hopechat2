import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { clampPosInt, computeDurationSeconds, isValidUuid } from './params'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isSuperAdmin, error: gateError } = await supabase.rpc('is_superadmin')
    if (gateError || !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const { searchParams } = new URL(req.url)

    const page = clampPosInt(searchParams.get('page'), 1, Number.MAX_SAFE_INTEGER)
    const limit = clampPosInt(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT)
    const offset = Math.min((page - 1) * limit, MAX_OFFSET)
    const businessId = searchParams.get('business_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const q = searchParams.get('q')?.trim()
    const userFilter = searchParams.get('user')?.trim()

    let query = adminSupabase
      .from('auth_sessions')
      .select('*, businesses(name), profiles(email)', { count: 'exact' })

    if (isValidUuid(businessId)) {
      query = query.eq('business_id', businessId)
    }

    if (from && !Number.isNaN(Date.parse(from))) {
      query = query.gte('session_start', new Date(from).toISOString())
    }
    if (to && !Number.isNaN(Date.parse(to))) {
      query = query.lte('session_start', new Date(to).toISOString())
    }

    if (q) {
      const escaped = q.replace(/[*?]/g, '')
      const pattern = `%${escaped}%`
      query = query.or(`city.ilike.${pattern},country.ilike.${pattern},user_agent.ilike.${pattern}`)
    }

    if (userFilter) {
      const escaped = userFilter.replace(/[*?]/g, '')
      query = query.ilike('profiles.email', `%${escaped}%`)
    }

    const { data, error, count } = await query
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const sessions = (data ?? []).map((row) => ({
      business_id: row.business_id,
      business_name: row.businesses?.name ?? null,
      user_id: row.user_id,
      email: row.profiles?.email ?? null,
      session_id: row.session_id,
      ip_address: row.ip_address,
      city: row.city,
      country: row.country,
      country_region: row.country_region,
      latitude: row.latitude,
      longitude: row.longitude,
      user_agent: row.user_agent,
      path: row.path,
      session_start: row.session_start,
      last_seen: row.last_seen,
      duration_seconds: computeDurationSeconds(row.session_start ?? '', row.last_seen ?? ''),
    }))

    return NextResponse.json({
      sessions,
      count: count ?? sessions.length,
      page,
      limit,
    })
  } catch (error: unknown) {
    console.error('Admin sessions error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}