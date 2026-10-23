-- Todo CPF que entra no sistema passa pela mesma validação (dígitos
-- verificadores e sequências): funcionários e responsável da conta. Alunos já
-- são validados em students_registration_rules. Só roda quando o CPF muda,
-- para não travar a edição de cadastros antigos.

create or replace function public.tg_staff_cpf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cpf is not null and new.cpf <> ''
     and (tg_op = 'INSERT' or new.cpf is distinct from old.cpf) then
    new.cpf := regexp_replace(new.cpf, '\D', '', 'g');
    if not public.is_valid_cpf(new.cpf) then
      raise exception 'CPF inválido. Confira os números digitados.'
        using errcode = 'MP002';
    end if;
    if exists (
      select 1 from public.staff s
       where s.account_id = new.account_id and s.id <> new.id and s.cpf = new.cpf
    ) then
      raise exception 'Já existe um funcionário com este CPF na academia.'
        using errcode = 'MP003';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_cpf on public.staff;
create trigger staff_cpf
before insert or update on public.staff
for each row execute function public.tg_staff_cpf();

create or replace function public.tg_accounts_cpf()
returns trigger
language plpgsql
as $$
begin
  if new.document_type = 'cpf'
     and (tg_op = 'INSERT' or new.document is distinct from old.document or new.document_type is distinct from old.document_type) then
    new.document := regexp_replace(coalesce(new.document, ''), '\D', '', 'g');
    if not public.is_valid_cpf(new.document) then
      raise exception 'CPF inválido. Confira os números digitados.'
        using errcode = 'MP002';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_cpf on public.accounts;
create trigger accounts_cpf
before insert or update on public.accounts
for each row execute function public.tg_accounts_cpf();
