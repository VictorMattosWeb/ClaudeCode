-- =============================================================================
-- onPreserv — esquema completo para Postgres autônomo
-- =============================================================================
-- Banco NOVO e VAZIO. Não migra dados; cria a estrutura do zero.
--
-- O que mudou em relação ao esquema do Supabase:
--
--  1. `auth.users` não existe fora do Supabase. Foi substituída por
--     `public.users`, com hash de senha e sessões próprias.
--
--  2. Estoque e RDO foram removidos — os módulos saíram do produto. São 6
--     tabelas e 1 enum a menos.
--
--  3. As colunas que guardavam id de usuário SEM chave estrangeira
--     (`criado_por`, `solicitante_id`, `notificacoes.user_id`, ...) agora têm
--     FK de verdade. Era a origem dos registros órfãos apontando para usuários
--     inexistentes, que apagavam o nome de quem fez o quê no histórico.
--
--  4. SEM Row Level Security. A autorização passa a ser código no backend,
--     explícito e testável. A RLS anterior liberava qualquer usuário
--     autenticado a ler tudo — as permissões por módulo só existiam no
--     front-end, o que não é proteção nenhuma.
--
--  5. As colunas adicionadas por migrations posteriores já vêm no CREATE TABLE.
--
-- Aplicação:  psql "$DATABASE_URL" -f server/db/001_schema.sql
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid, crypt
CREATE EXTENSION IF NOT EXISTS citext;     -- e-mail sem distinção de caixa


-- =============================================================================
-- Tipos
-- =============================================================================
CREATE TYPE app_role          AS ENUM ('admin', 'user', 'viewer');
CREATE TYPE app_module        AS ENUM ('dashboard','lotes','preservacoes','atividades','cronograma','tarefas','solicitacoes');
CREATE TYPE lot_tipo          AS ENUM ('novo','retirado_campo');
CREATE TYPE delete_item_type  AS ENUM ('lote','preservacao','atividade','tarefa','quadro','edicao_preservacao');
CREATE TYPE solicitacao_status AS ENUM ('pendente','aprovado','recusado');
CREATE TYPE notificacao_tipo  AS ENUM ('solicitacao_criada','solicitacao_respondida','tarefa_atribuida','tarefa_comentada','tarefa_mencionada','tarefa_alterada');
CREATE TYPE task_status       AS ENUM ('a_fazer','em_andamento','em_revisao','concluido','bloqueado');
CREATE TYPE task_priority     AS ENUM ('baixa','media','alta','critica');
CREATE TYPE task_modulo       AS ENUM ('lote','cronograma','preservacao','atividade','solicitacao','geral');
CREATE TYPE task_aprovacao    AS ENUM ('pendente','aprovado','reprovado');


-- =============================================================================
-- Identidade — substitui auth.users
-- =============================================================================

-- `citext` no e-mail: "Ana@empresa.com" e "ana@empresa.com" passam a ser a
-- mesma conta, e o UNIQUE impede o cadastro duplicado que a comparação
-- sensível a caixa deixaria passar.
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT NOT NULL UNIQUE,
  -- Hash Argon2id ou bcrypt gerado pelo backend. NUNCA a senha em claro.
  senha_hash     TEXT NOT NULL,
  email_confirmado_em TIMESTAMPTZ,
  ultimo_login_em     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessões persistidas: permitem revogar acesso de um dispositivo específico e
-- encerrar todas as sessões de alguém desativado — o que um JWT solto, sem
-- estado no servidor, não permite.
CREATE TABLE sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL UNIQUE,
  user_agent     TEXT,
  ip             INET,
  expira_em      TIMESTAMPTZ NOT NULL,
  revogada_em    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id) WHERE revogada_em IS NULL;

CREATE TABLE password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expira_em   TIMESTAMPTZ NOT NULL,
  usado_em    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  email      CITEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  cargo      TEXT,
  -- Caminho do arquivo no armazenamento, não uma URL: URL assinada expira.
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE user_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module      app_module NOT NULL,
  allowed     BOOLEAN NOT NULL DEFAULT true,
  is_override BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

CREATE TABLE role_permissions (
  role       app_role NOT NULL,
  module     app_module NOT NULL,
  action     TEXT NOT NULL,
  allowed    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, module, action)
);

CREATE TABLE cargos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  categoria  TEXT NOT NULL DEFAULT 'MOD' CHECK (categoria IN ('MOD','MOI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE convites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  email      CITEXT,
  cargo      TEXT,
  role       app_role NOT NULL DEFAULT 'user',
  criado_por UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  usado_em   TIMESTAMPTZ,
  usado_por  UUID REFERENCES users(id) ON DELETE SET NULL,
  revogado   BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE user_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  acao       TEXT NOT NULL,
  detalhes   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- Lotes e preservação
-- =============================================================================
CREATE TABLE lots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador_interno TEXT UNIQUE,
  tipo_lote             lot_tipo NOT NULL DEFAULT 'novo',
  codigo                TEXT NOT NULL,
  descricao             TEXT NOT NULL,
  localizacao           TEXT NOT NULL DEFAULT '',
  rua                   TEXT NOT NULL DEFAULT '',
  prateleira            TEXT NOT NULL DEFAULT '',
  fornecedor            TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  observacoes           TEXT NOT NULL DEFAULT '',
  -- Ciclo de preservação em dias corridos. NULL = ciclo semanal (padrão).
  frequencia_dias       INTEGER CHECK (frequencia_dias IS NULL OR frequencia_dias BETWEEN 1 AND 365),
  criado_por            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A busca por código é a operação mais frequente da tela de Lotes. Sem índice,
-- cada consulta varre a tabela inteira.
CREATE INDEX lots_codigo_idx ON lots (codigo);
CREATE INDEX lots_created_at_idx ON lots (created_at DESC, id);

CREATE TABLE preservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id      UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  proxima     DATE,
  responsavel TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  criado_por  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX preservations_lot_idx ON preservations (lot_id, data, id);

CREATE TABLE lot_identifier_counters (
  tipo          lot_tipo PRIMARY KEY,
  ultimo_numero INTEGER NOT NULL DEFAULT 0
);
INSERT INTO lot_identifier_counters (tipo, ultimo_numero) VALUES ('novo', 0), ('retirado_campo', 0);

CREATE TABLE activities (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                  TEXT NOT NULL UNIQUE,
  descricao               TEXT NOT NULL,
  local                   TEXT NOT NULL DEFAULT 'campo' CHECK (local IN ('campo','almoxarifado')),
  frequencia_almoxarifado INTEGER NOT NULL DEFAULT 30,
  frequencia_campo        INTEGER NOT NULL DEFAULT 30,
  observacoes             TEXT NOT NULL DEFAULT '',
  ativo                   BOOLEAN NOT NULL DEFAULT true,
  criado_por              UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- Cronograma
-- =============================================================================
CREATE TABLE cronograma_medicoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  descricao       TEXT NOT NULL DEFAULT '',
  data_referencia DATE,
  ordem           INTEGER NOT NULL DEFAULT 0,
  criado_por      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cronograma_itens (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicao_id         UUID NOT NULL REFERENCES cronograma_medicoes(id) ON DELETE CASCADE,
  semana             TEXT NOT NULL DEFAULT '',
  preservacao        TEXT NOT NULL DEFAULT '',
  tag                TEXT NOT NULL,
  unidade            TEXT NOT NULL,
  gabinete           TEXT NOT NULL,
  tipo               TEXT NOT NULL DEFAULT '',
  data_prevista      DATE,
  data_realizada     DATE,
  status             TEXT NOT NULL DEFAULT 'PENDENTE',
  motivo_divergencia TEXT NOT NULL DEFAULT '',
  observacoes        TEXT NOT NULL DEFAULT '',
  criado_por         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cronograma_itens_medicao_idx ON cronograma_itens (medicao_id, created_at, id);


-- =============================================================================
-- Tarefas
-- =============================================================================
CREATE TABLE task_boards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  descricao  TEXT NOT NULL DEFAULT '',
  cor        TEXT NOT NULL DEFAULT '#00ffa3',
  equipe     TEXT NOT NULL DEFAULT '',
  posicao    INTEGER NOT NULL DEFAULT 0,
  arquivado  BOOLEAN NOT NULL DEFAULT false,
  criado_por UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id                   UUID REFERENCES task_boards(id) ON DELETE SET NULL,
  titulo                     TEXT NOT NULL,
  descricao                  TEXT NOT NULL DEFAULT '',
  status                     task_status NOT NULL DEFAULT 'a_fazer',
  prioridade                 task_priority NOT NULL DEFAULT 'media',
  aprovacao                  task_aprovacao NOT NULL DEFAULT 'pendente',
  responsavel_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  criado_por                 UUID REFERENCES users(id) ON DELETE SET NULL,
  modulo_relacionado         task_modulo NOT NULL DEFAULT 'geral',
  item_relacionado_id        TEXT,
  item_relacionado_descricao TEXT NOT NULL DEFAULT '',
  prazo                      DATE,
  concluido_em               TIMESTAMPTZ,
  posicao                    INTEGER NOT NULL DEFAULT 0,
  observacoes                TEXT NOT NULL DEFAULT '',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- O quadro lê sempre por (status, posicao); o `id` fecha a ordem para a
-- paginação não perder linhas quando `posicao` empata.
CREATE INDEX tasks_kanban_idx ON tasks (status, posicao, id);

CREATE TABLE task_labels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  cor        TEXT NOT NULL DEFAULT '#00ffa3',
  descricao  TEXT NOT NULL DEFAULT '',
  criado_por UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_label_assignments (
  task_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE task_assignees (
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mensagem   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_mentions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id         UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  user_id_mencionado UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  path       TEXT NOT NULL,
  mime       TEXT,
  tamanho    BIGINT,
  criado_por UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  titulo       TEXT NOT NULL,
  concluido    BOOLEAN NOT NULL DEFAULT false,
  posicao      INTEGER NOT NULL DEFAULT 0,
  criado_por   UUID REFERENCES users(id) ON DELETE SET NULL,
  concluido_em TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  acao       TEXT NOT NULL,
  de         TEXT,
  para       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- Solicitações e notificações
-- =============================================================================
CREATE TABLE solicitacoes_exclusao (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             delete_item_type NOT NULL,
  item_id          TEXT NOT NULL,
  item_descricao   TEXT,
  solicitante_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  justificativa    TEXT NOT NULL,
  status           solicitacao_status NOT NULL DEFAULT 'pendente',
  analisado_por    UUID REFERENCES users(id) ON DELETE SET NULL,
  resposta         TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resposta    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE solicitacoes_edicao_preservacao (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preservation_id  UUID NOT NULL REFERENCES preservations(id) ON DELETE CASCADE,
  lot_id           UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  dados_atuais     JSONB NOT NULL,
  dados_propostos  JSONB NOT NULL,
  justificativa    TEXT NOT NULL,
  status           solicitacao_status NOT NULL DEFAULT 'pendente',
  solicitante_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analisado_por    UUID REFERENCES users(id) ON DELETE SET NULL,
  resposta         TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resposta    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notificacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo            notificacao_tipo NOT NULL,
  titulo          TEXT NOT NULL,
  mensagem        TEXT NOT NULL,
  referencia_id   TEXT,
  referencia_tipo TEXT NOT NULL DEFAULT 'solicitacao',
  lida            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notificacoes_nao_lidas_idx ON notificacoes (user_id, created_at DESC) WHERE NOT lida;


-- =============================================================================
-- updated_at automático
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','profiles','user_permissions','lots','preservations','activities',
    'cronograma_medicoes','cronograma_itens','tasks','task_boards','task_subtasks',
    'solicitacoes_exclusao','solicitacoes_edicao_preservacao','notificacoes'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END;
$$;


-- =============================================================================
-- Identificador interno do lote (NOV-0001, RTC-0001)
-- =============================================================================
-- Numeração sequencial por tipo. O `FOR UPDATE` serializa concorrentes: sem
-- ele, duas importações simultâneas gerariam o mesmo identificador.
CREATE OR REPLACE FUNCTION gerar_identificador_lote(_tipo lot_tipo)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  proximo INTEGER;
  prefixo TEXT;
BEGIN
  SELECT ultimo_numero + 1 INTO proximo
    FROM lot_identifier_counters WHERE tipo = _tipo FOR UPDATE;

  UPDATE lot_identifier_counters SET ultimo_numero = proximo WHERE tipo = _tipo;

  prefixo := CASE _tipo WHEN 'novo' THEN 'NOV' ELSE 'RTC' END;
  RETURN prefixo || '-' || lpad(proximo::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_identificador_lote() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.identificador_interno IS NULL OR NEW.identificador_interno = '' THEN
    NEW.identificador_interno := gerar_identificador_lote(NEW.tipo_lote);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_identificador_lote
  BEFORE INSERT ON lots
  FOR EACH ROW EXECUTE FUNCTION set_identificador_lote();


-- =============================================================================
-- Semente mínima
-- =============================================================================
-- Permissões padrão por papel. Admin recebe tudo; viewer só leitura; user
-- opera. Sem estas linhas o sistema sobe com todo mundo sem acesso a nada.
INSERT INTO role_permissions (role, module, action, allowed)
SELECT r, m, a,
       CASE
         WHEN r = 'admin' THEN true
         WHEN r = 'viewer' THEN a = 'view'
         ELSE a IN ('view','create','edit','import','export','request_delete')
       END
FROM unnest(ARRAY['admin','user','viewer']::app_role[]) r
CROSS JOIN unnest(enum_range(NULL::app_module)) m
CROSS JOIN unnest(ARRAY['view','create','edit','delete','import','export','approve','request_delete']) a;

COMMIT;
