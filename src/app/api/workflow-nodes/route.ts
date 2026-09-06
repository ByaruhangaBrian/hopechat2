import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { WorkflowNodeType } from '@/types';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const levelParam = searchParams.get('level');
    const parentIdParam = searchParams.get('parent_node_id');

    let query = supabase
      .from('workflow_nodes')
      .select(`
        *,
        options:node_options(*),
        parent_node:workflow_nodes!workflow_nodes_parent_node_id_fkey(id, title, node_key)
      `)
      .eq('business_id', profile.business_id)
      .order('level', { ascending: true })
      .order('created_at', { ascending: false });

    if (levelParam) {
      const level = parseInt(levelParam, 10);
      if (!isNaN(level)) {
        query = query.eq('level', level);
      }
    }

    if (parentIdParam) {
      query = query.eq('parent_node_id', parentIdParam);
    }

    const { data: nodes, error } = await query;

    if (error) {
      console.error('[workflow-nodes] Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort options inside each node by position
    const formatted = (nodes || []).map((node) => ({
      ...node,
      options: (node.options || []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
    }));

    return NextResponse.json({ nodes: formatted });
  } catch (err: any) {
    console.error('[workflow-nodes] Route error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const {
      title,
      node_key: rawNodeKey,
      node_type = 'menu',
      parent_node_id = null,
      header_text = null,
      body_text,
      footer_text = null,
      metadata = {},
      level: explicitLevel,
      options = [],
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body_text || typeof body_text !== 'string') {
      return NextResponse.json({ error: 'Body text is required' }, { status: 400 });
    }

    const validTypes: WorkflowNodeType[] = ['menu', 'question', 'form', 'action'];
    if (!validTypes.includes(node_type as WorkflowNodeType)) {
      return NextResponse.json({ error: `Invalid node_type. Allowed: ${validTypes.join(', ')}` }, { status: 400 });
    }

    if (options.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 options allowed per node (Meta WhatsApp limit)' }, { status: 400 });
    }

    // Calculate level
    let calculatedLevel = explicitLevel ? Number(explicitLevel) : 1;
    if (parent_node_id && !explicitLevel) {
      const { data: parent } = await supabase
        .from('workflow_nodes')
        .select('level')
        .eq('id', parent_node_id)
        .eq('business_id', profile.business_id)
        .single();
      if (parent) {
        calculatedLevel = Math.min(5, (parent.level || 1) + 1);
      }
    }

    // Generate unique node_key if missing
    let nodeKey = (rawNodeKey || title.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30)).trim();
    if (!nodeKey) nodeKey = `node_${Date.now()}`;

    // Ensure node_key uniqueness for this business
    const { data: existingKey } = await supabase
      .from('workflow_nodes')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('node_key', nodeKey)
      .maybeSingle();

    if (existingKey) {
      nodeKey = `${nodeKey}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Validate options
    const isButtons = options.length <= 3;
    const maxLabelLength = isButtons ? 20 : 24;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.label || typeof opt.label !== 'string') {
        return NextResponse.json({ error: `Option at position ${i + 1} requires a label` }, { status: 400 });
      }
      if (opt.label.length > maxLabelLength) {
        return NextResponse.json({
          error: `Option "${opt.label}" exceeds Meta's limit of ${maxLabelLength} characters for ${isButtons ? 'buttons' : 'list items'}`
        }, { status: 400 });
      }
    }

    // Use admin client for atomic insertion of node + options
    const admin = supabaseAdmin();

    const { data: newNode, error: nodeError } = await admin
      .from('workflow_nodes')
      .insert({
        business_id: profile.business_id,
        parent_node_id,
        title: title.trim(),
        node_key: nodeKey,
        node_type,
        header_text: header_text ? String(header_text).trim() : null,
        body_text: String(body_text).trim(),
        footer_text: footer_text ? String(footer_text).trim() : null,
        metadata: metadata || {},
        level: calculatedLevel,
      })
      .select()
      .single();

    if (nodeError || !newNode) {
      console.error('[workflow-nodes] Insert error:', nodeError);
      return NextResponse.json({ error: nodeError?.message || 'Failed to create node' }, { status: 500 });
    }

    // Insert options if provided
    let createdOptions: any[] = [];
    if (options && options.length > 0) {
      const optionsRows = options.map((opt: any, index: number) => ({
        node_id: newNode.id,
        option_id: opt.option_id ? String(opt.option_id).trim() : `opt_${index + 1}`,
        label: String(opt.label).trim(),
        description: opt.description ? String(opt.description).trim() : null,
        next_node_id: opt.next_node_id || null,
        is_correct_answer: Boolean(opt.is_correct_answer),
        points: typeof opt.points === 'number' ? opt.points : (opt.is_correct_answer ? 10 : 0),
        position: typeof opt.position === 'number' ? opt.position : index,
      }));

      const { data: insertedOpts, error: optsError } = await admin
        .from('node_options')
        .insert(optionsRows)
        .select();

      if (optsError) {
        console.error('[workflow-nodes] Options insert error:', optsError);
      } else {
        createdOptions = insertedOpts || [];
      }
    }

    return NextResponse.json({
      node: {
        ...newNode,
        options: createdOptions,
      }
    }, { status: 201 });
  } catch (err: any) {
    console.error('[workflow-nodes] POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
