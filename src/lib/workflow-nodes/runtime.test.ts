import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleNodeInteraction, dispatchWorkflowNode } from './runtime';

// Mock Supabase admin client
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: 'msg_1' }, error: null }),
  }),
});
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
});

let mockSessionData: any = null;
let mockNodeData: any = null;
let mockContactData: any = null;
let mockConfigData: any = null;

vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'user_sessions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
              }),
            }),
          }),
          upsert: mockUpsert,
        };
      }
      if (table === 'workflow_nodes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockNodeData, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: mockNodeData, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'node_options') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'contacts') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: mockContactData, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockContactData, error: null }),
            }),
          }),
        };
      }
      if (table === 'whatsapp_config') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockConfigData, error: null }),
            }),
          }),
        };
      }
      if (table === 'conversations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'conv_1' }, error: null }),
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      if (table === 'messages') {
        return {
          insert: mockInsert,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    },
  }),
}));

vi.mock('@/lib/whatsapp/meta-api', () => ({
  sendInteractiveMessage: vi.fn().mockResolvedValue({ messageId: 'wamid_interactive_123' }),
  sendTextMessage: vi.fn().mockResolvedValue({ messageId: 'wamid_text_123' }),
}));

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: (val: string) => val,
}));

describe('Workflow Nodes Runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionData = null;
    mockNodeData = null;
    mockContactData = { id: 'contact_1', phone: '+256700123456', name: 'John Doe' };
    mockConfigData = { phone_number_id: 'phone_1', access_token: 'valid_token', user_id: 'user_1' };
  });

  describe('handleNodeInteraction', () => {
    it('returns handled: false when option does not match active session or any node', async () => {
      mockSessionData = {
        business_id: 'biz_1',
        contact_id: 'contact_1',
        current_node_id: 'node_1',
        quiz_score: 0,
      };

      mockNodeData = {
        id: 'node_1',
        title: 'Quiz Question',
        node_key: 'quiz_q1',
        node_type: 'question',
        options: [
          { option_id: 'opt_1', label: 'Paris', is_correct_answer: true, points: 10 },
          { option_id: 'opt_2', label: 'London', is_correct_answer: false, points: 0 },
        ],
      };

      // Customer sent something unmapped e.g. "opt_999"
      const result = await handleNodeInteraction('biz_1', 'contact_1', 'opt_999');
      expect(result.handled).toBe(false);
    });

    it('calculates score correctly on question nodes and advances session to next node', async () => {
      mockSessionData = {
        business_id: 'biz_1',
        contact_id: 'contact_1',
        current_node_id: 'node_1',
        quiz_score: 20,
        session_data: { answers: [] },
      };

      mockNodeData = {
        id: 'node_1',
        business_id: 'biz_1',
        title: 'Biology Question 1',
        node_key: 'bio_q1',
        node_type: 'question',
        body_text: 'What produces ATP?',
        options: [
          { option_id: 'opt_1', label: 'Nucleus', is_correct_answer: false, points: 0, next_node_id: 'node_2' },
          { option_id: 'opt_2', label: 'Mitochondria', is_correct_answer: true, points: 15, next_node_id: 'node_2' },
        ],
      };

      const result = await handleNodeInteraction('biz_1', 'contact_1', 'opt_2');

      expect(result.handled).toBe(true);
      expect(result.isQuestion).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(result.score).toBe(35); // 20 + 15
      expect(result.nextNodeId).toBe('node_2');
      expect(result.completed).toBe(false);

      // Verify user_sessions upsert was called with updated score and node
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: 'biz_1',
          contact_id: 'contact_1',
          current_node_id: 'node_2',
          quiz_score: 35,
        }),
        expect.anything()
      );
    });

    it('does not increment score when incorrect answer is chosen', async () => {
      mockSessionData = {
        business_id: 'biz_1',
        contact_id: 'contact_1',
        current_node_id: 'node_1',
        quiz_score: 20,
        session_data: { answers: [] },
      };

      mockNodeData = {
        id: 'node_1',
        business_id: 'biz_1',
        title: 'Biology Question 1',
        node_key: 'bio_q1',
        node_type: 'question',
        body_text: 'What produces ATP?',
        options: [
          { option_id: 'opt_1', label: 'Nucleus', is_correct_answer: false, points: 0, next_node_id: 'node_2' },
          { option_id: 'opt_2', label: 'Mitochondria', is_correct_answer: true, points: 15, next_node_id: 'node_2' },
        ],
      };

      const result = await handleNodeInteraction('biz_1', 'contact_1', 'opt_1');

      expect(result.handled).toBe(true);
      expect(result.isQuestion).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(20); // Unchanged
      expect(result.nextNodeId).toBe('node_2');
    });

    it('completes the session when next_node_id is null and finishes assessment', async () => {
      mockSessionData = {
        business_id: 'biz_1',
        contact_id: 'contact_1',
        current_node_id: 'node_final',
        quiz_score: 50,
        session_data: { answers: [] },
      };

      mockNodeData = {
        id: 'node_final',
        business_id: 'biz_1',
        title: 'Final Question',
        node_key: 'quiz_final',
        node_type: 'question',
        body_text: 'End of quiz',
        options: [
          { option_id: 'opt_finish', label: 'Submit', is_correct_answer: true, points: 10, next_node_id: null },
        ],
      };

      const result = await handleNodeInteraction('biz_1', 'contact_1', 'opt_finish');

      expect(result.handled).toBe(true);
      expect(result.completed).toBe(true);
      expect(result.nextNodeId).toBeNull();
      expect(result.score).toBe(60);

      // Verify current_node_id was reset to null
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          current_node_id: null,
          quiz_score: 60,
        }),
        expect.anything()
      );
    });
  });

  describe('dispatchWorkflowNode', () => {
    it('dispatches buttons when options are <= 3', async () => {
      const { sendInteractiveMessage } = await import('@/lib/whatsapp/meta-api');

      mockNodeData = {
        id: 'node_menu',
        title: 'Main Menu',
        node_key: 'main_menu',
        node_type: 'menu',
        header_text: 'Welcome',
        body_text: 'Please choose an option:',
        footer_text: 'HopeChat Menu',
        options: [
          { option_id: 'opt_1', label: 'Catalog', position: 0 },
          { option_id: 'opt_2', label: 'Take Quiz', position: 1 },
        ],
      };

      const res = await dispatchWorkflowNode({
        businessId: 'biz_1',
        contactId: 'contact_1',
        nodeId: 'node_menu',
      });

      expect(res.success).toBe(true);
      expect(sendInteractiveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Please choose an option:',
          items: [
            { id: 'opt_1', label: 'Catalog' },
            { id: 'opt_2', label: 'Take Quiz' },
          ],
        })
      );
    });
  });
});
