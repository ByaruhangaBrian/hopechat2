'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  MonitorSmartphone,
  RefreshCw,
  Search,
  Building2,
  User,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Globe2,
  FilterX,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 25

interface SessionRow {
  business_id: string
  business_name: string | null
  user_id: string
  email: string | null
  session_id: string
  ip_address: string | null
  city: string | null
  country: string | null
  country_region: string | null
  user_agent: string | null
  session_start: string
  last_seen: string
  duration_seconds: number
}

interface SessionsResponse {
  sessions: SessionRow[]
  count: number
  page: number
  limit: number
}

interface BusinessOption {
  id: string
  name: string
}

export default function AdminActivityPage() {
  const supabase = createClient()

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<BusinessOption[]>([])

  const [businessId, setBusinessId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('businesses')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load business options:', error)
          return
        }
        setBusinesses((data || []) as BusinessOption[])
      })
    return () => {
      cancelled = true
    }
  }, [supabase])

  const loadSessions = useCallback(
    async (currPage: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(currPage))
        params.set('limit', String(PAGE_SIZE))
        if (businessId) params.set('business_id', businessId)
        if (fromDate) params.set('from', new Date(`${fromDate}T00:00:00`).toISOString())
        if (toDate) params.set('to', new Date(`${toDate}T23:59:59`).toISOString())
        if (search.trim()) params.set('q', search.trim())

        const res = await fetch(`/api/admin/sessions?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load sessions')

        const payload = data as SessionsResponse
        setSessions(payload.sessions || [])
        setCount(payload.count ?? 0)
      } catch {
        toast.error('Failed to load sessions')
      } finally {
        setLoading(false)
      }
    },
    [businessId, fromDate, toDate, search]
  )

  useEffect(() => {
    const t = setTimeout(() => void loadSessions(page), 350)
    return () => clearTimeout(t)
  }, [page, loadSessions])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const activeLast24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return sessions.filter((s) => new Date(s.last_seen).getTime() >= cutoff).length
  }, [sessions])

  const avgDuration = useMemo(() => {
    const withDuration = sessions.filter((s) => s.duration_seconds > 0)
    if (withDuration.length === 0) return 0
    return Math.round(
      withDuration.reduce((sum, s) => sum + s.duration_seconds, 0) / withDuration.length
    )
  }, [sessions])

  function formatDuration(seconds: number) {
    if (!seconds || seconds <= 0) return '—'
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins < 60) return `${mins}m ${secs}s`
    const hours = Math.floor(mins / 60)
    return `${hours}h ${mins % 60}m`
  }

  function getBrowser(ua: string | null) {
    if (!ua) return 'Unknown'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Other'
  }

  function locationLabel(row: SessionRow) {
    if (row.city || row.country) {
      return [row.city, row.country].filter(Boolean).join(', ')
    }
    return 'Unknown'
  }

  function clearFilters() {
    setBusinessId('')
    setFromDate('')
    setToDate('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6" />
            User Sessions
          </h1>
          <p className="text-muted-foreground">
            Cross-tenant login sessions. Location data is visible to superadmins only.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadSessions(page)}
          disabled={loading}
          className="border-border text-muted-foreground gap-1.5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {count.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active (last 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{activeLast24h}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Session Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatDuration(avgDuration)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search city, country or browser..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 bg-background border-border text-foreground"
            />
          </div>

          <Select
            value={businessId}
            onValueChange={(v) => {
              setBusinessId(v ?? '')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full bg-background border-border text-foreground lg:w-48">
              <SelectValue placeholder="All businesses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All businesses</SelectItem>
              {businesses.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="bg-background border-border text-foreground"
              aria-label="From date"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="bg-background border-border text-foreground"
              aria-label="To date"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground gap-1.5"
          >
            <FilterX className="h-4 w-4" />
            Clear
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            Sessions
          </CardTitle>
          <CardDescription>
            Showing {sessions.length} of {count.toLocaleString()} sessions · sorted by last
            seen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Business</TableHead>
                  <TableHead className="text-muted-foreground">Location</TableHead>
                  <TableHead className="text-muted-foreground">Started</TableHead>
                  <TableHead className="text-muted-foreground">Last Seen</TableHead>
                  <TableHead className="text-muted-foreground">Duration</TableHead>
                  <TableHead className="text-muted-foreground">Browser</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading sessions...
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No sessions match the current filters. Session capture activates once users
                      load an authenticated page after this feature ships.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((row) => (
                    <TableRow key={`${row.user_id}-${row.session_id}`} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {row.email ?? row.user_id}
                            </span>
                            {row.session_id && (
                              <span className="block max-w-44 truncate text-[10px] text-muted-foreground/60 font-mono">
                                {row.session_id.slice(0, 8)}…
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {row.business_name ?? '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <span className="block text-xs text-foreground">
                              {locationLabel(row)}
                            </span>
                            {row.country_region && (
                              <span className="block text-[10px] text-muted-foreground/60">
                                {row.country_region}
                              </span>
                            )}
                            {row.ip_address && (
                              <span className="block truncate max-w-32 text-[10px] text-muted-foreground/40 font-mono">
                                {row.ip_address}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-xs text-foreground">
                            {format(new Date(row.session_start), 'MMM d, HH:mm')}
                          </span>
                          <p className="text-[10px] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(row.session_start), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] border-border',
                              new Date(row.last_seen).getTime() >= Date.now() - 24 * 60 * 60 * 1000
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'text-muted-foreground'
                            )}
                          >
                            {formatDistanceToNow(new Date(row.last_seen), { addSuffix: true })}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground font-mono">
                          {formatDuration(row.duration_seconds)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {getBrowser(row.user_agent)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && sessions.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}