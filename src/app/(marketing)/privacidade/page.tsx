import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidade — musclePro",
  description:
    "Como o musclePro trata dados pessoais de estabelecimentos, equipes e alunos, em conformidade com a LGPD (Lei nº 13.709/2018).",
};

const EMAIL = (
  <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
);

const SECTIONS: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Quem somos e a quem esta política se aplica",
    content: (
      <>
        <p>
          O musclePro é uma plataforma de gestão para academias, estúdios, escolas de natação,
          boxes, academias de lutas e outros negócios de atividade física (“Clientes”). Esta
          Política explica como tratamos dados pessoais, nos termos da Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018 — LGPD).
        </p>
        <p>Ela se aplica a:</p>
        <ul>
          <li>
            responsáveis e equipes dos Clientes que usam a plataforma (“Usuários”);
          </li>
          <li>
            alunos e demais pessoas cujos dados os Clientes cadastram no musclePro (“Alunos”);
          </li>
          <li>pessoas que visitam nosso site ou entram em contato conosco.</li>
        </ul>
        <p>
          Esta Política complementa os nossos <Link href="/termos">Termos de Uso</Link>.
        </p>
      </>
    ),
  },
  {
    id: "papeis",
    title: "Controlador e operador: quem decide sobre os dados",
    content: (
      <>
        <p>A LGPD diferencia quem decide sobre o tratamento de quem apenas o executa:</p>
        <ul>
          <li>
            <strong>Dados de Alunos e da equipe cadastrados pelo Cliente:</strong> o estabelecimento
            é o <strong>controlador</strong> — é ele quem decide quais dados coletar, para quê e por
            quanto tempo. O musclePro atua como <strong>operador</strong>, tratando esses dados
            somente para prestar o serviço e seguindo as instruções do Cliente.
          </li>
          <li>
            <strong>Dados da conta, de faturamento, de uso da plataforma e de contato com o
            musclePro:</strong> nesses casos, o musclePro é o <strong>controlador</strong>.
          </li>
        </ul>
        <p>
          Se você é Aluno de um estabelecimento que usa o musclePro, a política de privacidade do
          próprio estabelecimento também se aplica ao seu caso, e ele é o seu primeiro canal de
          atendimento.
        </p>
      </>
    ),
  },
  {
    id: "dados-coletados",
    title: "Dados que tratamos",
    content: (
      <>
        <h3>Dados da conta e do estabelecimento</h3>
        <p>
          Nome, e-mail, telefone, cargo e senha (armazenada de forma criptografada) do responsável e
          dos Usuários; nome, razão social, CNPJ ou CPF, endereço, tipo de estabelecimento e
          dados de faturamento do Cliente; permissões atribuídas a cada membro da equipe.
        </p>

        <h3>Dados de Alunos inseridos pelo Cliente</h3>
        <p>
          Conforme o que cada estabelecimento decide cadastrar: nome, CPF, data de nascimento,
          contato (telefone, e-mail, endereço), responsável legal, plano contratado, histórico de
          mensalidades, pagamentos e inadimplência, frequência, observações da equipe e
          anotações de saúde relevantes para a prática de atividade física (por exemplo,
          restrições médicas, lesões e alergias).
        </p>
        <p>
          Dados de saúde são <strong>dados pessoais sensíveis</strong> (art. 5º, II, da LGPD) e têm
          proteção reforçada, descrita na seção “Dados sensíveis, crianças e adolescentes”.
        </p>

        <h3>Dados de uso e dados técnicos</h3>
        <p>
          Endereço IP, data e hora de acesso, tipo de navegador e dispositivo, páginas acessadas,
          ações realizadas na plataforma e registros de erro. Esses dados ajudam a manter a
          plataforma segura, a investigar incidentes e a melhorar o produto.
        </p>

        <h3>Comunicações</h3>
        <p>
          Mensagens enviadas ao nosso suporte ou ao e-mail {EMAIL}, com os dados que você decidir
          incluir.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Para que usamos os dados e bases legais",
    content: (
      <>
        <p>
          Quando o musclePro é controlador, tratamos dados pessoais para as finalidades abaixo,
          cada uma apoiada em uma base legal do art. 7º da LGPD:
        </p>
        <ul>
          <li>
            <strong>Criar e manter a conta, liberar acessos e prestar o serviço contratado</strong>{" "}
            — execução de contrato (art. 7º, V).
          </li>
          <li>
            <strong>Cobrar a assinatura e emitir documentos fiscais</strong> — execução de contrato
            e cumprimento de obrigação legal ou regulatória (art. 7º, V e II).
          </li>
          <li>
            <strong>Enviar e-mails transacionais</strong>, como links de acesso, redefinição de
            senha, avisos de cobrança e mudanças relevantes — execução de contrato (art. 7º, V).
          </li>
          <li>
            <strong>Guardar registros de acesso à aplicação</strong> pelo prazo de 6 (seis) meses —
            cumprimento de obrigação legal (art. 7º, II, e art. 15 do Marco Civil da Internet, Lei
            nº 12.965/2014).
          </li>
          <li>
            <strong>Proteger a plataforma, prevenir fraudes e investigar incidentes</strong> —
            legítimo interesse (art. 7º, IX).
          </li>
          <li>
            <strong>Entender o uso da plataforma e melhorar funcionalidades</strong>, de preferência
            com dados agregados ou anonimizados — legítimo interesse (art. 7º, IX).
          </li>
          <li>
            <strong>Responder a solicitações e defender direitos</strong> em processos judiciais,
            administrativos ou arbitrais — exercício regular de direitos (art. 7º, VI).
          </li>
        </ul>
        <p>
          Quanto aos dados de Alunos, as finalidades e a base legal são definidas pelo Cliente,
          como controlador. O musclePro trata esses dados apenas para executar o serviço e não os
          usa para finalidades próprias, como publicidade, nem os vende ou aluga.
        </p>
      </>
    ),
  },
  {
    id: "dados-sensiveis",
    title: "Dados sensíveis, crianças e adolescentes",
    content: (
      <>
        <p>
          Anotações de saúde de Alunos são tratadas pelo musclePro apenas por instrução do Cliente
          e somente para exibição e organização dentro da conta do estabelecimento. Cabe ao Cliente
          garantir uma base legal do art. 11 da LGPD — em regra, o consentimento específico e
          destacado do titular — e registrar apenas o que for necessário para a prática segura de
          atividade física.
        </p>
        <p>
          Muitos estabelecimentos atendem crianças e adolescentes, como escolas de natação e
          academias de lutas. Nesses casos, o Cliente deve tratar os dados no melhor interesse do
          menor e obter o consentimento de pelo menos um dos pais ou do responsável legal quando
          exigido, conforme o art. 14 da LGPD.
        </p>
        <p>
          Na plataforma, o acesso a esses dados segue as permissões que o Cliente define para cada
          membro da equipe.
        </p>
      </>
    ),
  },
  {
    id: "compartilhamento",
    title: "Compartilhamento e suboperadores",
    content: (
      <>
        <p>
          Não vendemos dados pessoais. Compartilhamos dados apenas quando necessário para operar o
          serviço, sempre com fornecedores que assumem obrigações de confidencialidade e segurança
          compatíveis com a LGPD. Nossos principais suboperadores são:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — banco de dados, armazenamento e autenticação de Usuários.
          </li>
          <li>
            <strong>Vercel</strong> — hospedagem e entrega da aplicação web.
          </li>
          <li>
            <strong>Resend</strong> — envio de e-mails transacionais, como links de acesso e
            redefinição de senha.
          </li>
        </ul>
        <p>Também podemos compartilhar dados:</p>
        <ul>
          <li>
            com autoridades públicas, quando houver obrigação legal, ordem judicial ou requisição
            de autoridade competente;
          </li>
          <li>
            com assessores jurídicos e contábeis, para cumprir obrigações e defender direitos;
          </li>
          <li>
            em operações societárias (como fusão, aquisição ou venda de ativos), com o novo
            responsável assumindo os compromissos desta Política.
          </li>
        </ul>
        <p>
          Se incluirmos ou trocarmos um suboperador relevante, atualizaremos esta Política e, quando
          for o caso, avisaremos os Clientes.
        </p>
      </>
    ),
  },
  {
    id: "transferencia-internacional",
    title: "Transferência internacional de dados",
    content: (
      <>
        <p>
          Alguns de nossos fornecedores podem armazenar ou processar dados em servidores fora do
          Brasil, como nos Estados Unidos e na União Europeia. Nesses casos, a transferência é
          feita com base nos mecanismos do art. 33 da LGPD, como cláusulas-padrão contratuais
          aprovadas pela Autoridade Nacional de Proteção de Dados (ANPD) ou outras garantias
          equivalentes previstas na regulamentação.
        </p>
        <p>
          Exigimos desses fornecedores um nível de proteção de dados compatível com o exigido pela
          lei brasileira.
        </p>
      </>
    ),
  },
  {
    id: "retencao",
    title: "Por quanto tempo guardamos os dados",
    content: (
      <>
        <ul>
          <li>
            <strong>Dados da conta e do Cliente:</strong> enquanto a conta estiver ativa e, depois do
            encerramento, pelo prazo necessário para cumprir obrigações legais, fiscais e
            regulatórias e para o exercício regular de direitos (em geral, até 5 anos).
          </li>
          <li>
            <strong>Registros de acesso à aplicação:</strong> por 6 (seis) meses, conforme o Marco
            Civil da Internet, ou por mais tempo se houver requisição de autoridade.
          </li>
          <li>
            <strong>Dados de Alunos:</strong> enquanto o Cliente mantiver a assinatura ou até que
            ele os exclua. Após o encerramento da conta, o Cliente tem 30 dias para pedir a
            exportação; depois disso, os dados são excluídos ou anonimizados em até 90 dias,
            inclusive das cópias de segurança.
          </li>
          <li>
            <strong>Comunicações com o suporte:</strong> pelo tempo necessário para atender ao
            pedido e por até 5 anos para fins de registro e defesa de direitos.
          </li>
        </ul>
        <p>
          Ao fim desses prazos, os dados são excluídos ou anonimizados, salvo quando a lei permitir
          ou exigir sua manutenção (art. 16 da LGPD).
        </p>
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Como protegemos os dados",
    content: (
      <>
        <p>
          Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não
          autorizados, perda, alteração ou vazamento, entre elas:
        </p>
        <ul>
          <li>criptografia em trânsito (HTTPS/TLS) em todas as conexões com a plataforma;</li>
          <li>criptografia em repouso nos bancos de dados e cópias de segurança dos fornecedores;</li>
          <li>senhas armazenadas apenas em formato criptografado (hash);</li>
          <li>
            isolamento dos dados de cada Cliente com regras de acesso no banco de dados, além de
            permissões por função dentro de cada conta;
          </li>
          <li>acesso interno restrito a quem precisa, com registro das operações;</li>
          <li>cópias de segurança periódicas e monitoramento da infraestrutura.</li>
        </ul>
        <p>
          Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que
          possa causar risco ou dano relevante aos titulares, comunicaremos os Clientes afetados
          sem demora injustificada e, quando formos controladores, a ANPD e os titulares, conforme
          o art. 48 da LGPD.
        </p>
      </>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos como titular",
    content: (
      <>
        <p>O art. 18 da LGPD garante ao titular dos dados o direito de pedir:</p>
        <ul>
          <li>confirmação de que existe tratamento dos seus dados;</li>
          <li>acesso aos dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em
            desacordo com a lei;
          </li>
          <li>portabilidade dos dados a outro fornecedor, conforme a regulamentação da ANPD;</li>
          <li>eliminação dos dados tratados com base no consentimento;</li>
          <li>informação sobre as entidades com as quais os dados foram compartilhados;</li>
          <li>
            informação sobre a possibilidade de não dar consentimento e sobre as consequências da
            recusa;
          </li>
          <li>revogação do consentimento.</li>
        </ul>
        <p>
          O titular também pode se opor a tratamentos feitos sem consentimento quando houver
          descumprimento da lei, pedir a revisão de decisões tomadas unicamente com base em
          tratamento automatizado (art. 20) e apresentar reclamação à ANPD.
        </p>
      </>
    ),
  },
  {
    id: "exercer-direitos",
    title: "Como exercer seus direitos",
    content: (
      <>
        <ul>
          <li>
            <strong>Usuários e Clientes:</strong> envie o pedido para {EMAIL}, a partir do e-mail
            cadastrado na conta. Podemos pedir informações adicionais para confirmar sua
            identidade.
          </li>
          <li>
            <strong>Alunos:</strong> procure primeiro o estabelecimento onde você está matriculado,
            que é o controlador dos seus dados. Se você nos procurar diretamente, encaminharemos o
            pedido ao estabelecimento responsável e o apoiaremos no atendimento.
          </li>
        </ul>
        <p>
          Respondemos aos pedidos em até 15 (quinze) dias, prazo previsto no art. 19 da LGPD para
          a declaração completa. Alguns pedidos podem ser recusados ou atendidos em parte quando a
          lei exigir a guarda dos dados; nesse caso, explicaremos o motivo.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento local",
    content: (
      <>
        <p>
          Usamos apenas cookies e tecnologias de armazenamento local do navegador que são{" "}
          <strong>essenciais</strong> para a plataforma funcionar, como os que mantêm sua sessão
          ativa depois do login, lembram preferências básicas da interface e protegem o acesso.
        </p>
        <p>
          Não usamos cookies de publicidade nem de rastreamento entre sites. Você pode apagar ou
          bloquear cookies nas configurações do navegador, mas, sem os essenciais, não será
          possível entrar na plataforma.
        </p>
      </>
    ),
  },
  {
    id: "contato",
    title: "Contato e encarregado de dados",
    content: (
      <p>
        Para dúvidas sobre esta Política, pedidos de titulares ou assuntos de proteção de dados,
        fale com o nosso canal de privacidade, que exerce a função de encarregado (art. 41 da
        LGPD), pelo e-mail {EMAIL}.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações desta política",
    content: (
      <p>
        Podemos atualizar esta Política para refletir mudanças no produto, nos fornecedores ou na
        legislação. A data da última atualização fica sempre no topo desta página. Quando a mudança
        for relevante, avisaremos os Clientes por e-mail ou pela plataforma antes de ela entrar em
        vigor.
      </p>
    ),
  },
  {
    id: "foro",
    title: "Lei aplicável e foro",
    content: (
      <p>
        Esta Política é regida pelas leis da República Federativa do Brasil, em especial a LGPD.
        Eventuais controvérsias serão resolvidas no foro indicado nos{" "}
        <Link href="/termos">Termos de Uso</Link>, ressalvados os casos em que a lei garanta ao
        titular o direito de demandar no foro do seu domicílio.
      </p>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt="15 de outubro de 2026"
      intro={
        <p>
          Levamos a sério os dados que academias, estúdios e escolas confiam ao musclePro. Esta
          Política explica, em linguagem direta, quais dados tratamos, por que, com quem
          compartilhamos e como você pode exercer seus direitos previstos na LGPD.
        </p>
      }
      sections={SECTIONS}
      related={{ href: "/termos", label: "Termos de Uso" }}
    />
  );
}
