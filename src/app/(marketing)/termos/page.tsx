import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Termos de Uso — musclePro",
  description:
    "Regras de uso da plataforma musclePro, o sistema de gestão para academias, estúdios, escolas de natação, boxes e academias de lutas.",
};

const EMAIL = (
  <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
);

const SECTIONS: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Quem somos",
    content: (
      <>
        <p>
          O musclePro é uma plataforma de gestão, oferecida como software como serviço (SaaS), para
          academias, estúdios, escolas de natação, boxes, academias de lutas e outros negócios de
          atividade física. A plataforma reúne cadastro de alunos, planos, cobranças, controle de
          inadimplência, tarefas e gestão de equipe com permissões.
        </p>
        <p>
          Nestes Termos, “musclePro”, “nós” e “nosso” se referem à empresa responsável pela
          plataforma. “Cliente” é o estabelecimento (pessoa física ou jurídica) que contrata o
          musclePro. “Usuário” é toda pessoa que acessa a plataforma em nome do Cliente, como o
          titular da conta, gestores, recepcionistas e professores. “Aluno” é a pessoa cujos dados o
          Cliente cadastra na plataforma.
        </p>
      </>
    ),
  },
  {
    id: "aceitacao",
    title: "Aceitação dos termos",
    content: (
      <>
        <p>
          Ao criar uma conta, acessar ou usar o musclePro, o Cliente e cada Usuário declaram que
          leram, entenderam e aceitam estes Termos de Uso e a nossa{" "}
          <Link href="/privacidade">Política de Privacidade</Link>, que faz parte deles.
        </p>
        <p>
          Quem aceita estes Termos em nome de um estabelecimento declara ter poderes para
          representá-lo e vinculá-lo a estas condições. Se você não concorda com algum ponto, não
          use a plataforma.
        </p>
        <p>
          Se houver proposta comercial ou contrato específico assinado entre o Cliente e o
          musclePro, as condições desse documento prevalecem sobre estes Termos naquilo em que forem
          diferentes.
        </p>
      </>
    ),
  },
  {
    id: "contas",
    title: "Contas e responsabilidades",
    content: (
      <>
        <p>
          Para usar o musclePro, o Cliente faz um cadastro com dados verdadeiros, completos e
          atualizados do estabelecimento e do responsável. O acesso é liberado após análise do
          nosso time, que pode pedir informações adicionais ou recusar cadastros incompletos ou
          inconsistentes.
        </p>
        <h3>Responsabilidades do Cliente</h3>
        <ul>
          <li>
            Manter a confidencialidade das senhas e dos links de acesso, e não compartilhar
            credenciais entre pessoas. Cada Usuário deve ter o próprio acesso.
          </li>
          <li>
            Definir quem da equipe pode acessar a plataforma e com quais permissões, e revogar
            acessos de quem deixar o estabelecimento.
          </li>
          <li>
            Responder por todas as ações feitas pelos seus Usuários dentro da conta.
          </li>
          <li>
            Garantir que os dados de Alunos cadastrados foram obtidos de forma lícita e que existe
            base legal para tratá-los, conforme a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018 — LGPD).
          </li>
          <li>
            Avisar o musclePro imediatamente pelo e-mail {EMAIL} se suspeitar de uso não
            autorizado da conta.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "uso-permitido",
    title: "Uso permitido",
    content: (
      <>
        <p>
          O musclePro concede ao Cliente, enquanto a assinatura estiver ativa, uma licença limitada,
          não exclusiva e intransferível para usar a plataforma na gestão do próprio
          estabelecimento.
        </p>
        <p>Não é permitido:</p>
        <ul>
          <li>
            usar a plataforma para fins ilegais, fraudulentos ou que violem direitos de terceiros,
            inclusive direitos de Alunos;
          </li>
          <li>
            cadastrar dados de pessoas sem base legal ou inserir conteúdo ofensivo, discriminatório
            ou que não tenha relação com a gestão do estabelecimento;
          </li>
          <li>
            tentar acessar áreas, contas ou dados de outros Clientes, ou burlar mecanismos de
            segurança e de permissão;
          </li>
          <li>
            copiar, modificar, fazer engenharia reversa, revender, sublicenciar ou disponibilizar a
            plataforma a terceiros;
          </li>
          <li>
            usar robôs, scripts ou extração automatizada de dados que sobrecarreguem a plataforma
            sem autorização prévia por escrito;
          </li>
          <li>enviar vírus, códigos maliciosos ou qualquer conteúdo que prejudique o serviço.</li>
        </ul>
        <p>
          O descumprimento destas regras permite ao musclePro suspender o acesso, de forma imediata
          quando houver risco à segurança da plataforma, de outros Clientes ou de titulares de
          dados.
        </p>
      </>
    ),
  },
  {
    id: "planos",
    title: "Planos, pagamento e período de teste",
    content: (
      <>
        <p>
          O musclePro é oferecido por assinatura. Os planos, preços, limites e formas de pagamento
          disponíveis são informados na contratação ou na proposta comercial.
        </p>
        <ul>
          <li>
            <strong>Período de teste.</strong> Podemos oferecer um período de teste gratuito, com
            duração e funcionalidades informadas no momento da oferta. Ao final do teste, a
            continuidade do uso depende da contratação de um plano pago. Se o Cliente não contratar,
            o acesso é suspenso e os dados seguem as regras da seção “Encerramento”.
          </li>
          <li>
            <strong>Cobrança.</strong> A assinatura é cobrada de forma antecipada e recorrente, no
            ciclo escolhido (mensal, trimestral ou anual, conforme disponível), até o cancelamento.
          </li>
          <li>
            <strong>Reajuste.</strong> Os valores podem ser reajustados anualmente por índice oficial
            de inflação ou alterados mediante aviso com pelo menos 30 (trinta) dias de antecedência.
            Se o Cliente não concordar, pode cancelar antes de a mudança valer.
          </li>
          <li>
            <strong>Atraso.</strong> Em caso de falta de pagamento, o musclePro avisa o Cliente e,
            se a pendência não for resolvida em até 15 (quinze) dias após o vencimento, pode
            suspender o acesso até a regularização.
          </li>
          <li>
            <strong>Tributos e reembolso.</strong> Os preços incluem os tributos aplicáveis, salvo
            indicação contrária. Valores de períodos já iniciados não são reembolsados, exceto
            quando a lei exigir.
          </li>
        </ul>
        <p>
          As cobranças que o Cliente faz aos próprios Alunos, ainda que registradas no musclePro,
          são de responsabilidade exclusiva do Cliente.
        </p>
      </>
    ),
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade e suporte",
    content: (
      <>
        <p>
          Trabalhamos para manter o musclePro disponível 24 horas por dia, 7 dias por semana, mas a
          plataforma pode ficar indisponível temporariamente por manutenção, atualizações, falhas
          de fornecedores de infraestrutura, problemas de conexão ou eventos de força maior.
        </p>
        <p>
          Manutenções programadas são feitas, sempre que possível, em horários de menor uso e com
          aviso prévio. Salvo acordo de nível de serviço (SLA) previsto em contrato específico, não
          garantimos disponibilidade ininterrupta ou livre de erros.
        </p>
        <p>
          O suporte é prestado pelos canais informados na plataforma e pelo e-mail {EMAIL}, em dias
          úteis e horário comercial (horário de Brasília). Podemos evoluir, alterar ou descontinuar
          funcionalidades para melhorar o serviço, sem reduzir de forma relevante o que foi
          contratado.
        </p>
      </>
    ),
  },
  {
    id: "dados",
    title: "Dados e proteção de dados pessoais",
    content: (
      <>
        <p>
          Em relação aos dados de Alunos e da equipe que o Cliente cadastra, o{" "}
          <strong>Cliente é o controlador</strong> e o <strong>musclePro é o operador</strong>, nos
          termos da LGPD. Isso significa que o Cliente decide quais dados coleta e para quê, e o
          musclePro trata esses dados apenas para prestar o serviço e conforme as instruções do
          Cliente.
        </p>
        <p>
          O Cliente é responsável por informar os Alunos sobre o tratamento, obter consentimento
          quando necessário (especialmente para dados de saúde e de crianças e adolescentes) e
          atender aos pedidos dos titulares. O musclePro auxilia o Cliente nessas tarefas dentro do
          que a plataforma permite.
        </p>
        <p>
          Os detalhes sobre quais dados tratamos, com quem compartilhamos, por quanto tempo
          guardamos e como protegemos estão na{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </>
    ),
  },
  {
    id: "propriedade-intelectual",
    title: "Propriedade intelectual",
    content: (
      <>
        <p>
          A plataforma, incluindo software, código-fonte, layout, marca, logotipo, textos,
          ilustrações e documentação, pertence ao musclePro ou a seus licenciantes e é protegida
          pelas leis de propriedade intelectual. Estes Termos não transferem ao Cliente nenhum
          direito sobre esses elementos além da licença de uso descrita acima.
        </p>
        <p>
          Os dados e conteúdos inseridos pelo Cliente continuam sendo do Cliente. O Cliente
          autoriza o musclePro a armazenar, processar e exibir esses conteúdos apenas na medida
          necessária para prestar o serviço.
        </p>
        <p>
          Sugestões e comentários enviados sobre a plataforma podem ser usados pelo musclePro para
          melhorar o produto, sem obrigação de pagamento ou de atribuição.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidade",
    title: "Limitação de responsabilidade",
    content: (
      <>
        <p>
          O musclePro é uma ferramenta de apoio à gestão. As decisões tomadas com base nas
          informações da plataforma — como cobranças, bloqueios de acesso, matrículas e
          orientações aos Alunos — são de responsabilidade do Cliente.
        </p>
        <p>Na máxima extensão permitida pela lei, o musclePro não responde por:</p>
        <ul>
          <li>
            lucros cessantes, perda de receita, perda de oportunidades ou outros danos indiretos;
          </li>
          <li>
            dados inseridos de forma incorreta, incompleta ou sem base legal pelo Cliente ou por
            seus Usuários;
          </li>
          <li>
            danos causados por uso indevido de credenciais, por falhas nos equipamentos ou na
            conexão do Cliente, ou por serviços de terceiros não contratados pelo musclePro;
          </li>
          <li>indisponibilidades causadas por caso fortuito ou força maior.</li>
        </ul>
        <p>
          Em qualquer caso, a responsabilidade total do musclePro fica limitada ao valor
          efetivamente pago pelo Cliente nos 12 (doze) meses anteriores ao fato que originou a
          reclamação. Essa limitação não se aplica a casos de dolo ou a situações em que a lei não
          permita limitar a responsabilidade.
        </p>
      </>
    ),
  },
  {
    id: "encerramento",
    title: "Suspensão e encerramento",
    content: (
      <>
        <p>
          O Cliente pode cancelar a assinatura a qualquer momento, pelo e-mail {EMAIL} ou pelos
          canais de atendimento informados na plataforma. O cancelamento vale ao fim do ciclo já pago, e o acesso continua disponível até
          lá.
        </p>
        <p>
          O musclePro pode suspender ou encerrar a conta em caso de falta de pagamento, violação
          destes Termos, uso que coloque em risco a plataforma ou terceiros, ou por ordem de
          autoridade competente. Sempre que possível, avisamos antes e damos prazo para correção.
        </p>
        <p>
          Após o encerramento, o Cliente tem 30 (trinta) dias para solicitar a exportação dos seus
          dados em formato estruturado. Depois desse prazo, os dados são excluídos ou anonimizados
          em até 90 (noventa) dias, inclusive das cópias de segurança, exceto quando a lei exigir
          ou permitir a guarda por mais tempo.
        </p>
      </>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações destes termos",
    content: (
      <>
        <p>
          Podemos atualizar estes Termos para refletir mudanças no produto, na lei ou na forma como
          operamos. Quando a mudança for relevante, avisaremos o Cliente por e-mail ou pela
          plataforma com pelo menos 15 (quinze) dias de antecedência.
        </p>
        <p>
          Continuar usando o musclePro depois que a nova versão entrar em vigor significa aceitar
          as alterações. Se o Cliente não concordar, pode cancelar a assinatura antes disso.
        </p>
      </>
    ),
  },
  {
    id: "disposicoes-gerais",
    title: "Disposições gerais",
    content: (
      <>
        <ul>
          <li>
            Se alguma cláusula destes Termos for considerada inválida, as demais continuam valendo.
          </li>
          <li>
            A tolerância com o descumprimento de qualquer obrigação não significa renúncia ao
            direito de exigi-la depois.
          </li>
          <li>
            O Cliente não pode transferir sua conta ou estes Termos a terceiros sem autorização do
            musclePro. O musclePro pode transferi-los em caso de reorganização societária, fusão ou
            venda de ativos, mantidas as condições aqui previstas.
          </li>
          <li>
            Comunicações sobre a conta são enviadas para o e-mail cadastrado pelo Cliente, que deve
            mantê-lo atualizado.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "foro",
    title: "Lei aplicável e foro",
    content: (
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
        da comarca da sede do musclePro para resolver qualquer controvérsia relacionada a eles, com
        renúncia a qualquer outro, por mais privilegiado que seja, ressalvadas as hipóteses em que a
        lei determine foro diferente.
      </p>
    ),
  },
  {
    id: "contato",
    title: "Contato",
    content: (
      <p>
        Dúvidas, sugestões ou reclamações sobre estes Termos podem ser enviadas para {EMAIL}.
        Respondemos em até 5 (cinco) dias úteis.
      </p>
    ),
  },
];

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt="15 de outubro de 2026"
      intro={
        <p>
          Estes Termos explicam as regras para usar o musclePro: o que oferecemos, o que esperamos
          de quem usa a plataforma e como lidamos com pagamentos, dados e encerramento da conta.
          Leia com atenção antes de começar.
        </p>
      }
      sections={SECTIONS}
      related={{ href: "/privacidade", label: "Política de Privacidade" }}
    />
  );
}
