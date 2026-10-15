-- Dados de demonstração (Academia Alfa). Pré-requisito: usuários no Supabase Auth
-- com os e-mails dono@academia.test e admin@musclepro.test (crie pelo painel ou
-- pela Auth Admin API). Aplicar com: supabase db query --linked -f supabase/seed/demo-academia.sql
do $$
declare
  v_owner uuid := (select id from auth.users where email = 'dono@academia.test');
  v_admin uuid := (select id from auth.users where email = 'admin@musclepro.test');
  v_acc uuid;
  v_centro uuid;
  v_norte uuid;
  v_mensal uuid;
  v_tri uuid;
  v_anual uuid;
  v_s uuid;
  v_staff uuid;
begin
  if v_owner is null or v_admin is null then
    raise exception 'auth users not found';
  end if;

  insert into public.admin_profiles (user_id, email, full_name, role)
  values (v_admin, 'admin@musclepro.test', 'Admin musclePro', 'admin')
  on conflict (user_id) do nothing;

  insert into public.accounts (
    full_name, email, phone, document_type, document, company_name, business_type,
    address, contact_phone, contact_email, units_range, active_students_range,
    status, active, approved_at, invited_at, auth_user_id, payment_status, payment_plan, source
  ) values (
    'Victor Alfa', 'dono@academia.test', '(11) 98888-0000', 'cnpj', '12345678000199',
    'Academia Alfa', 'academia', 'Rua das Flores, 100 · Centro · São Paulo/SP',
    '(11) 3333-4444', 'contato@academiaalfa.com.br', '2-5', '100-300',
    'criada', true, now(), now(), v_owner, 'trial', 'musclePro', 'seed'
  ) returning id into v_acc;

  insert into public.units (account_id, name, address, city, state, phone, is_main)
  values (v_acc, 'Centro', 'Rua das Flores, 100', 'São Paulo', 'SP', '(11) 3333-4444', true)
  returning id into v_centro;
  insert into public.units (account_id, name, address, city, state, phone, is_main)
  values (v_acc, 'Zona Norte', 'Av. Brasil, 2200', 'São Paulo', 'SP', '(11) 3333-5555', false)
  returning id into v_norte;

  insert into public.plans (account_id, name, amount, frequency, description)
  values (v_acc, 'Mensal', 129, 'mensal', 'Acesso livre à musculação, sem fidelidade.')
  returning id into v_mensal;
  insert into public.plans (account_id, name, amount, frequency, description)
  values (v_acc, 'Trimestral', 349, 'trimestral', 'Três meses com desconto. Renovação automática.')
  returning id into v_tri;
  insert into public.plans (account_id, name, amount, frequency, description)
  values (v_acc, 'Anual', 1290, 'anual', 'Melhor valor por mês. Inclui avaliação física.')
  returning id into v_anual;

  insert into public.staff (account_id, unit_id, full_name, cpf, email, phone, role, started_at, can_register_students, can_send_payment_links, can_create_workouts)
  values
    (v_acc, v_centro, 'Carla Mendes', '11122233344', 'carla@academiaalfa.com.br', '(11) 97777-1111', 'recepcao', '2025-02-03', true, true, false),
    (v_acc, v_norte, 'Roberto Lima', '22233344455', 'roberto@academiaalfa.com.br', '(11) 97777-2222', 'personal', '2024-08-19', false, false, true),
    (v_acc, v_centro, 'Ana Costa', '33344455566', 'ana@academiaalfa.com.br', '(11) 97777-3333', 'contabilidade', '2023-11-06', false, true, false),
    (v_acc, null, 'Júlio Santos', '44455566677', 'julio@academiaalfa.com.br', '(11) 97777-4444', 'gestao', '2022-05-10', true, true, true);

  -- 1. Mariana: trimestral, em dia (próxima em 20 dias), histórico pago
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, email, emergency_contact_name, emergency_contact_phone, plan_started_at)
  values (v_acc, v_centro, v_tri, 'Mariana Freitas', '12345678901', '1994-03-12', '(11) 98765-4321', 'mariana@email.com', 'Paulo Freitas', '(11) 98888-1234', current_date - 70)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_tri, 349, current_date - 70, (current_date - 70)::timestamptz, 'pix', 'pago', 'Ciclo anterior'),
         (v_acc, v_s, v_tri, 349, current_date + 20, null, null, 'pendente', 'Próximo ciclo');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 2. Lucas: mensal, inadimplente há 12 dias
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, email, emergency_contact_name, emergency_contact_phone, plan_started_at)
  values (v_acc, v_centro, v_mensal, 'Lucas Andrade', '23456789012', '1998-07-22', '(11) 98765-1001', 'lucas@email.com', 'Rita Andrade', '(11) 98888-2001', current_date - 42)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 42, (current_date - 41)::timestamptz, 'cartao', 'pago', 'Mês anterior'),
         (v_acc, v_s, v_mensal, 129, current_date - 12, null, null, 'pendente', 'Mês atual');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 3. Beatriz: mensal, inadimplente há 3 dias
  insert into public.students (account_id, unit_id, plan_id, full_name, birth_date, whatsapp, emergency_contact_name, emergency_contact_phone, plan_started_at)
  values (v_acc, v_norte, v_mensal, 'Beatriz Souza', '2001-11-05', '(11) 98765-1002', 'Marcos Souza', '(11) 98888-2002', current_date - 33)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 33, (current_date - 33)::timestamptz, 'pix', 'pago', 'Mês anterior'),
         (v_acc, v_s, v_mensal, 129, current_date - 3, null, null, 'pendente', 'Mês atual');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 4. Carlos: anual, vence em 2 dias
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, email, emergency_contact_name, emergency_contact_phone, medical_notes, plan_started_at)
  values (v_acc, v_centro, v_anual, 'Carlos Eduardo Lima', '34567890123', '1987-01-30', '(11) 98765-1003', 'carlos@email.com', 'Helena Lima', '(11) 98888-2003', 'Lesão antiga no joelho direito. Evitar agachamento profundo.', current_date - 363)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_anual, 1290, current_date - 363, (current_date - 363)::timestamptz, 'boleto', 'pago', 'Ano anterior'),
         (v_acc, v_s, v_anual, 1290, current_date + 2, null, null, 'pendente', 'Renovação anual');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Júlio Santos"}');

  -- 5. Fernanda: mensal, vence em 5 dias, sem contato de emergência
  insert into public.students (account_id, unit_id, plan_id, full_name, birth_date, whatsapp, email, plan_started_at)
  values (v_acc, v_centro, v_mensal, 'Fernanda Oliveira', '1995-09-14', '(11) 98765-1004', 'fernanda@email.com', current_date - 25)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 25, (current_date - 25)::timestamptz, 'pix', 'pago', 'Mês anterior'),
         (v_acc, v_s, v_mensal, 129, current_date + 5, null, null, 'pendente', 'Mês atual');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 6. Rafael: mensal, em dia, aniversário hoje
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, emergency_contact_name, emergency_contact_phone, plan_started_at)
  values (v_acc, v_norte, v_mensal, 'Rafael Martins', '45678901234', make_date(1990, extract(month from current_date)::int, extract(day from current_date)::int), '(11) 98765-1005', 'Sofia Martins', '(11) 98888-2005', current_date - 15)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 15, (current_date - 15)::timestamptz, 'dinheiro', 'pago', 'Mês atual'),
         (v_acc, v_s, v_mensal, 129, current_date + 15, null, null, 'pendente', 'Próximo mês');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 7. Juliana: ativa, sem plano
  insert into public.students (account_id, unit_id, full_name, birth_date, whatsapp, email, emergency_contact_name, emergency_contact_phone)
  values (v_acc, v_centro, 'Juliana Castro', '1999-05-20', '(11) 98765-1006', 'juliana@email.com', 'Renato Castro', '(11) 98888-2006')
  returning id into v_s;
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 8. Pedro: trimestral, em dia, condição médica
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, emergency_contact_name, emergency_contact_phone, medical_notes, plan_started_at)
  values (v_acc, v_centro, v_tri, 'Pedro Henrique Alves', '56789012345', '1979-12-02', '(11) 98765-1007', 'Lúcia Alves', '(11) 98888-2007', 'Hipertensão controlada com medicação. Monitorar intensidade.', current_date - 50)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_tri, 349, current_date - 50, (current_date - 49)::timestamptz, 'pix', 'pago', 'Ciclo atual'),
         (v_acc, v_s, v_tri, 349, current_date + 40, null, null, 'pendente', 'Próximo ciclo');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Júlio Santos"}');

  -- 9. Amanda: inativa
  insert into public.students (account_id, unit_id, plan_id, full_name, birth_date, whatsapp, emergency_contact_name, emergency_contact_phone, status, plan_started_at)
  values (v_acc, v_norte, v_mensal, 'Amanda Ribeiro', '1996-04-08', '(11) 98765-1008', 'Caio Ribeiro', '(11) 98888-2008', 'inativo', current_date - 120)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 120, (current_date - 120)::timestamptz, 'pix', 'pago', 'Último mês pago'),
         (v_acc, v_s, v_mensal, 129, current_date - 90, null, null, 'cancelado', 'Cancelado ao sair');
  insert into public.student_activities (account_id, student_id, kind, title, body, metadata) values (v_acc, v_s, 'status', 'Aluno marcado como inativo', 'Mudou de cidade.', '{"by":"Júlio Santos"}');

  -- 10. Thiago: mensal, inadimplente há 25 dias
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, email, emergency_contact_name, emergency_contact_phone, plan_started_at)
  values (v_acc, v_centro, v_mensal, 'Thiago Rocha', '67890123456', '1992-08-17', '(11) 98765-1009', 'thiago@email.com', 'Vera Rocha', '(11) 98888-2009', current_date - 55)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 55, (current_date - 54)::timestamptz, 'cartao', 'pago', 'Mês anterior'),
         (v_acc, v_s, v_mensal, 129, current_date - 25, null, null, 'pendente', 'Mês atual');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');
  insert into public.student_activities (account_id, student_id, kind, title, body, metadata) values (v_acc, v_s, 'cobranca', 'Cobrança enviada por WhatsApp', 'R$ 129 · vencimento há 25 dias.', '{"by":"Ana Costa","channel":"whatsapp"}');

  -- 11. Camila: mensal, em dia, condição médica
  insert into public.students (account_id, unit_id, plan_id, full_name, birth_date, whatsapp, emergency_contact_name, emergency_contact_phone, medical_notes, plan_started_at)
  values (v_acc, v_centro, v_mensal, 'Camila Nunes', '2000-02-27', '(11) 98765-1010', 'Bruno Nunes', '(11) 98888-2010', 'Asma leve. Bombinha na mochila.', current_date - 18)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_mensal, 129, current_date - 18, (current_date - 18)::timestamptz, 'pix', 'pago', 'Mês atual'),
         (v_acc, v_s, v_mensal, 129, current_date + 12, null, null, 'pendente', 'Próximo mês');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Carla Mendes"}');

  -- 12. Diego: anual, em dia
  insert into public.students (account_id, unit_id, plan_id, full_name, cpf, birth_date, whatsapp, email, emergency_contact_name, emergency_contact_phone, plan_started_at)
  values (v_acc, v_norte, v_anual, 'Diego Alves', '78901234567', '1985-06-09', '(11) 98765-1011', 'diego@email.com', 'Patrícia Alves', '(11) 98888-2011', current_date - 60)
  returning id into v_s;
  insert into public.payments (account_id, student_id, plan_id, amount, due_at, paid_at, method, status, reference_label)
  values (v_acc, v_s, v_anual, 1290, current_date - 60, (current_date - 60)::timestamptz, 'cartao', 'pago', 'Ano atual'),
         (v_acc, v_s, v_anual, 1290, current_date + 305, null, null, 'pendente', 'Renovação anual');
  insert into public.student_activities (account_id, student_id, kind, title, metadata) values (v_acc, v_s, 'cadastro', 'Aluno cadastrado', '{"by":"Júlio Santos"}');

  -- tarefas
  select id into v_s from public.students where account_id = v_acc and full_name = 'Lucas Andrade';
  insert into public.tasks (account_id, student_id, title, description, due_at, priority)
  values (v_acc, v_s, 'Ligar para o Lucas sobre o atraso', 'Já foram dois lembretes por WhatsApp sem resposta.', now() - interval '2 days', 'alta');
  select id into v_s from public.students where account_id = v_acc and full_name = 'Fernanda Oliveira';
  insert into public.tasks (account_id, student_id, title, description, due_at, priority)
  values (v_acc, v_s, 'Pedir contato de emergência da Fernanda', null, now() + interval '6 hours', 'media');
  insert into public.tasks (account_id, title, description, due_at, priority)
  values (v_acc, 'Revisar valores dos planos para 2027', 'Comparar com as academias da região.', now() + interval '10 days', 'baixa');
  insert into public.tasks (account_id, title, due_at, priority, done, done_at)
  values (v_acc, 'Trocar lâmpadas da sala 2', now() - interval '5 days', 'baixa', true, now() - interval '4 days');

  -- aviso do backoffice
  insert into public.platform_announcements (created_by, kind, title, body, published_at)
  values (v_admin, 'sistema', 'Bem-vindo ao musclePro', 'Sua conta está ativa. Comece cadastrando os planos e os alunos da sua unidade principal.', now());
end $$;

select
  (select count(*) from public.students) as students,
  (select count(*) from public.payments) as payments,
  (select count(*) from public.staff) as staff,
  (select count(*) from public.plans) as plans,
  (select count(*) from public.tasks) as tasks;
