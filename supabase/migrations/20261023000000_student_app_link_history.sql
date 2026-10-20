-- Histórico dos links da área do aluno: o link vigente pode ser reenviado
-- sem gerar outro, e a equipe vê quem gerou cada link e o que aconteceu com ele.
-- A tabela continua sem políticas: só o servidor (service role) lê o token.

alter table public.student_app_tokens
  add column if not exists link_token text,
  add column if not exists revoked_at timestamptz,
  add column if not exists created_by_name text;

comment on column public.student_app_tokens.link_token is
  'Token em claro do link vigente, para reenviar. Apagado quando o link é usado, substituído ou removido.';
comment on column public.student_app_tokens.revoked_at is
  'Quando o link foi substituído por outro ou o acesso foi removido.';
