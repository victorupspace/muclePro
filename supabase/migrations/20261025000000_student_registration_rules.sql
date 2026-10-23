-- Regras do cadastro de aluno, valendo também fora da tela:
--   * só dá para cadastrar aluno quando a academia tem ao menos um plano ativo;
--   * CPF precisa ter dígitos verificadores válidos e não pode ser sequência
--     (111.111.111-11, 123.456.789-09...) nem repetir outro aluno da academia;
--   * data de nascimento: pelo menos 1 mês de idade e no máximo 120 anos.
-- As regras de CPF e nascimento só rodam quando o campo muda, para não
-- travar a edição de cadastros antigos.
-- Também traz o endereço do aluno (preenchido a partir do CEP).

alter table public.students
  add column if not exists address_zip text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_state text;

create or replace function public.is_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  d text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  base text;
  s integer;
  r integer;
  i integer;
begin
  if length(d) <> 11 then
    return false;
  end if;
  -- Todos os dígitos iguais.
  if d ~ '^(\d)\1{10}$' then
    return false;
  end if;
  -- Os 9 primeiros em sequência crescente ou decrescente (123456789, 987654321...).
  base := substr(d, 1, 9);
  if position(base in '01234567890123456789') > 0 or position(base in '98765432109876543210') > 0 then
    return false;
  end if;

  s := 0;
  for i in 1..9 loop
    s := s + substr(d, i, 1)::integer * (11 - i);
  end loop;
  r := (s * 10) % 11;
  if r = 10 then r := 0; end if;
  if r <> substr(d, 10, 1)::integer then
    return false;
  end if;

  s := 0;
  for i in 1..10 loop
    s := s + substr(d, i, 1)::integer * (12 - i);
  end loop;
  r := (s * 10) % 11;
  if r = 10 then r := 0; end if;
  return r = substr(d, 11, 1)::integer;
end;
$$;

create or replace function public.tg_students_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and not exists (
    select 1 from public.plans p where p.account_id = new.account_id and p.active
  ) then
    raise exception 'Cadastre ao menos um plano antes de cadastrar alunos.'
      using errcode = 'MP001';
  end if;

  if new.cpf is not null and new.cpf <> ''
     and (tg_op = 'INSERT' or new.cpf is distinct from old.cpf) then
    new.cpf := regexp_replace(new.cpf, '\D', '', 'g');
    if not public.is_valid_cpf(new.cpf) then
      raise exception 'CPF inválido. Confira os números digitados.'
        using errcode = 'MP002';
    end if;
    if exists (
      select 1 from public.students s
       where s.account_id = new.account_id
         and s.id <> new.id
         and s.cpf = new.cpf
    ) then
      raise exception 'Já existe um aluno com este CPF na academia.'
        using errcode = 'MP003';
    end if;
  end if;

  if new.birth_date is not null
     and (tg_op = 'INSERT' or new.birth_date is distinct from old.birth_date) then
    if new.birth_date > (current_date - interval '1 month')::date then
      raise exception 'A data de nascimento precisa ser de pelo menos 1 mês atrás.'
        using errcode = 'MP004';
    end if;
    if new.birth_date < (current_date - interval '120 years')::date then
      raise exception 'Confira a data de nascimento: ela indica mais de 120 anos.'
        using errcode = 'MP004';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists students_registration_rules on public.students;
create trigger students_registration_rules
before insert or update on public.students
for each row execute function public.tg_students_registration_rules();
