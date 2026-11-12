CREATE TABLE users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE sessions(
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE app_settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE legal_cases(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'intake',
  last_asked TEXT,
  confidence_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE conversations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES legal_cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE case_facts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(case_id, key)
);
CREATE TABLE uploaded_files(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  doc_type TEXT,
  extracted_text TEXT,
  analysis_json TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE documents(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE document_versions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  note TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  is_signed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(document_id, version)
);
CREATE TRIGGER doc_version_immutable BEFORE UPDATE OF content, version, document_id ON document_versions
WHEN OLD.is_signed = 1
BEGIN SELECT RAISE(ABORT, 'Подписанная версия документа неизменяема. Создайте новую версию.'); END;
CREATE TRIGGER doc_version_no_delete BEFORE DELETE ON document_versions
WHEN OLD.is_signed = 1
BEGIN SELECT RAISE(ABORT, 'Подписанную версию документа нельзя удалить.'); END;

CREATE TABLE signatures(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_version_id INTEGER NOT NULL REFERENCES document_versions(id),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 1,
  content_sha256 TEXT NOT NULL,
  artifact_path TEXT,
  signed_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX uq_signature_active ON signatures(document_version_id) WHERE status IN ('pending','signed_demo');

CREATE TABLE dispatches(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_version_id INTEGER NOT NULL REFERENCES document_versions(id),
  signature_id INTEGER NOT NULL REFERENCES signatures(id),
  case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  tracking_number TEXT,
  recipient_name TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  submitted_at TEXT
);
CREATE UNIQUE INDEX uq_dispatch_version ON dispatches(document_version_id);
CREATE TABLE dispatch_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_id INTEGER NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(dispatch_id, status)
);
CREATE TABLE legal_reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  level TEXT NOT NULL,
  details_json TEXT NOT NULL,
  critical_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE deadlines(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  UNIQUE(case_id, document_id, title)
);
CREATE INDEX ix_messages_conv ON messages(conversation_id, id);
CREATE INDEX ix_cases_user ON legal_cases(user_id);
CREATE INDEX ix_docs_user ON documents(user_id);
