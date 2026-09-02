-- =============================================================================
-- MANUTENÇÃO — operações destrutivas, execução manual e deliberada
-- =============================================================================
--
-- Este arquivo NÃO é uma migration. Ele fica fora de `supabase/migrations/`
-- de propósito, para não ser aplicado por um `supabase db push` distraído.
--
-- COMO USAR
--   1. Rode a SEÇÃO 0 (diagnóstico) e leia os números.
--   2. Faça backup:  supabase db dump -f backup_$(date +%F).sql
--   3. Descomente APENAS o bloco que você quer executar.
--   4. Rode dentro de uma transação e confira antes do COMMIT.
--
-- Nada aqui é reversível depois do COMMIT.
-- =============================================================================


-- =============================================================================
-- SEÇÃO 0 — DIAGNÓSTICO (seguro, só lê)
-- =============================================================================

-- Quantas solicitações existem, por situação?
SELECT status, count(*) AS total
  FROM public.solicitacoes_exclusao
 GROUP BY status
 UNION ALL
SELECT 'edicao_' || status, count(*)
  FROM public.solicitacoes_edicao_preservacao
 GROUP BY status;

-- Quem é administrador e quem não é?
SELECT
  CASE WHEN ur.role = 'admin' THEN 'ADMIN (será mantido)'
       ELSE 'NÃO-ADMIN (será removido)' END AS classificacao,
  count(*) AS total
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'
GROUP BY 1;

-- Lista nominal dos que seriam removidos — confira ANTES de executar.
SELECT p.email, p.nome, p.cargo, p.status, p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
   WHERE ur.user_id = p.id AND ur.role = 'admin'
)
ORDER BY p.created_at;

-- O que ficaria órfão. Estas colunas guardam o id do usuário mas NÃO têm chave
-- estrangeira para auth.users, então não são limpas pelo cascade: os registros
-- permanecem e passam a apontar para um usuário que não existe mais. Na tela
-- isso aparece como responsável/solicitante em branco.
SELECT 'tarefas com responsável removido' AS impacto, count(*) AS total
  FROM public.tasks t
 WHERE t.responsavel_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = t.responsavel_id AND ur.role = 'admin')
 UNION ALL
SELECT 'solicitações com solicitante removido', count(*)
  FROM public.solicitacoes_exclusao s
 WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = s.solicitante_id AND ur.role = 'admin');


-- =============================================================================
-- SEÇÃO 1 — LIMPAR O HISTÓRICO DE SOLICITAÇÕES
-- =============================================================================
--
-- OPÇÃO A (recomendada): remove apenas as já resolvidas, preservando o que
-- ainda aguarda decisão. Uma solicitação pendente apagada é um pedido que a
-- pessoa fez e ninguém nunca vai responder.
--
-- BEGIN;
--   DELETE FROM public.solicitacoes_exclusao
--    WHERE status IN ('aprovado', 'recusado');
--
--   DELETE FROM public.solicitacoes_edicao_preservacao
--    WHERE status IN ('aprovado', 'recusado');
--
--   -- Confira o que sobrou antes de confirmar:
--   SELECT status, count(*) FROM public.solicitacoes_exclusao GROUP BY status;
-- COMMIT;

-- OPÇÃO B: apaga tudo, inclusive as pendentes.
--
-- BEGIN;
--   DELETE FROM public.solicitacoes_exclusao;
--   DELETE FROM public.solicitacoes_edicao_preservacao;
-- COMMIT;

-- As notificações que apontam para solicitações apagadas ficam sem destino.
-- Rode junto com qualquer uma das opções acima:
--
--   DELETE FROM public.notificacoes WHERE referencia_tipo = 'solicitacao';


-- =============================================================================
-- SEÇÃO 2 — REMOVER TODOS OS USUÁRIOS QUE NÃO SÃO ADMINISTRADORES
-- =============================================================================
--
-- ATENÇÃO — leia antes de descomentar:
--
--   * Apagar de `auth.users` cascateia para `profiles`, `user_roles` e
--     `user_permissions`. Isso é o comportamento desejado.
--
--   * NÃO cascateia para `tasks.responsavel_id`, `solicitacoes.solicitante_id`,
--     `task_boards.criado_por` e afins — essas colunas não têm FK. Os registros
--     continuam existindo apontando para ids inexistentes. Não corrompe nada,
--     mas o histórico perde o nome de quem fez o quê. A SEÇÃO 0 mostra quantos.
--
--   * Se algum administrador só existe como não-admin hoje, ele será removido.
--     Confirme a lista da SEÇÃO 0 antes.
--
--   * Você não consegue se apagar por engano: a cláusula exclui o usuário da
--     sessão atual explicitamente.
--
-- BEGIN;
--   DELETE FROM auth.users u
--    WHERE u.id <> auth.uid()
--      AND NOT EXISTS (
--        SELECT 1 FROM public.user_roles ur
--         WHERE ur.user_id = u.id AND ur.role = 'admin'
--      );
--
--   -- Deve sobrar apenas administradores:
--   SELECT p.email, p.nome FROM public.profiles p ORDER BY p.email;
-- COMMIT;

-- Convites ainda abertos, gerados para pessoas que acabaram de ser removidas:
--
--   UPDATE public.convites SET revogado = true
--    WHERE usado_em IS NULL AND revogado = false;
