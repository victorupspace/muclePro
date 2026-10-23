# musclePro

Sistema de gestão (CRM) para estabelecimentos de atividade física: academias,
estúdios, escolas de natação, boxes de crossfit e academias de lutas.

Cobre a operação administrativa do negócio em quatro frentes: **estrutura**
(empresa, endereço, filiais), **equipe** (funcionários, perfis e permissões),
**comercial** (planos por valor e frequência, base de alunos) e **controle**
(visão consolidada, com a inadimplência em destaque).

Áreas: home page (marketing), cadastro/aprovação de contas, plataforma do
estabelecimento (`/plataforma`) e backoffice interno (`/admin/backoffice`).

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS, Framer Motion, GSAP
- Supabase (Postgres, Auth, RLS)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do projeto Supabase
npm run dev
```

Abra `http://localhost:3000`.

Banco: o schema vive em `supabase/migrations/` e é aplicado com
`supabase db query --linked -f supabase/migrations/<arquivo>.sql` (ou `supabase db push`
se você tiver a senha do banco). Para popular um ambiente de demonstração, crie dois
usuários no Supabase Auth (um dono do estabelecimento e um admin do backoffice) e rode
`supabase/seed/demo-academia.sql`.

Variáveis em `.env.local`:

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys (secret). Nunca commitar. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` em dev |

## Estrutura

```
src/
  app/
    (marketing)/           Home page
    (auth)/                Login, cadastro, definição de senha
    plataforma/            Área logada: dashboard, alunos, equipe, planos, tarefas, configurações
    admin/backoffice/  Backoffice interno
    api/                   Rotas de API (aprovação de contas, senha)
  components/
    sections/              Seções da home
    layout/                Header, Footer
    ui/                    CTA, Logo, SplashScreen, CountUp…
    plataforma/, admin/, auth/
  lib/
    brand/mark.ts          Geometria do símbolo da marca (logo, splash, favicon)
    supabase/              Clientes Supabase e envio de leads
supabase/
  migrations/              Schema do banco (accounts, units, staff, plans, students, payments, tasks…)
  seed/                    Dados de demonstração
  functions/               Edge functions (notificação via Telegram)
public/assets/             Vídeos, logos, favicon
```

## Marca

Cores da marca são CSS variables em `src/app/globals.css` (`--color-brand`,
`--color-brand-hover`, `--color-brand-light`), expostas no Tailwind como
`brand`, `brand-hover` e `brand-light`. O símbolo (punho) vive em
`src/lib/brand/mark.ts` e é compartilhado por Logo, SplashScreen, favicon e PDF.
