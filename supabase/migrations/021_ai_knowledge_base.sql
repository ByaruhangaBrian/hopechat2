-- AI Knowledge Base table for storing dynamic snippets for AI prompt injection
CREATE TABLE IF NOT EXISTS business_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_business_knowledge_business_id ON business_knowledge(business_id);
CREATE INDEX IF NOT EXISTS idx_business_knowledge_active_expiry ON business_knowledge(is_active, expires_at);

-- Enable RLS
ALTER TABLE business_knowledge ENABLE ROW LEVEL SECURITY;

-- Business scoped policy
DROP POLICY IF EXISTS "Business scoped business_knowledge" ON business_knowledge;
CREATE POLICY "Business scoped business_knowledge" ON business_knowledge 
  FOR ALL USING (business_id = get_user_business_id() OR is_superadmin());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_knowledge_updated_at
    BEFORE UPDATE ON business_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
