const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\cliente\\.gemini\\antigravity\\skills';
const translations = {
  "gsd-add-tests": "Gera testes para uma fase concluída com base nos critérios de UAT e implementação",
  "gsd-ai-integration-phase": "Gera um contrato de design AI-SPEC.md para fases que envolvem a construção de sistemas de IA.",
  "gsd-audit-fix": "Pipeline autônomo de auditoria para correção — encontrar problemas, classificar, corrigir, testar, commitar",
  "gsd-audit-milestone": "Audita a conclusão de um marco em relação à intenção original antes de arquivar",
  "gsd-audit-uat": "Auditoria inter-fases de todos os itens pendentes de UAT e verificação",
  "gsd-autonomous": "Executa todas as fases restantes de forma autônoma — discutir→planejar→executar por fase",
  "gsd-capture": "Captura ideias, tarefas, notas e sementes para seu destino",
  "gsd-cleanup": "Arquiva diretórios de fase acumulados de marcos concluídos",
  "gsd-code-review": "Revisa arquivos fonte alterados durante uma fase em busca de bugs, problemas de segurança e qualidade de código",
  "gsd-complete-milestone": "Arquiva marco concluído e prepara para a próxima versão",
  "gsd-config": "Configura as definições do GSD — alternância de fluxos de trabalho, ajustes avançados, integrações e perfil do modelo",
  "gsd-debug": "Depuração sistemática com estado persistente através de reinicializações de contexto",
  "gsd-discuss-phase": "Coleta contexto da fase através de questionamento adaptativo antes do planejamento.",
  "gsd-docs-update": "Gera ou atualiza a documentação do projeto verificada contra a base de código",
  "gsd-eval-review": "Audita a cobertura de avaliação de uma fase de IA executada e produz um plano de remediação EVAL-REVIEW.md.",
  "gsd-execute-phase": "Executa todos os planos em uma fase com paralelização baseada em ondas",
  "gsd-explore": "Ideação socrática e roteamento de ideias — pensar sobre ideias antes de se comprometer com planos",
  "gsd-extract-learnings": "Extrai decisões, lições, padrões e surpresas de artefatos de fase concluídos",
  "gsd-fast": "Executa uma tarefa trivial inline — sem subagentes, sem sobrecarga de planejamento",
  "gsd-forensics": "Investigação pós-morte para fluxos de trabalho GSD que falharam — diagnostica o que deu errado.",
  "gsd-graphify": "Constrói, consulta e inspeciona o grafo de conhecimento do projeto em .planning/graphs/",
  "gsd-health": "Diagnostica a saúde do diretório de planejamento e, opcionalmente, repara problemas",
  "gsd-help": "Mostra comandos GSD disponíveis e guia de uso",
  "gsd-import": "Ingere planos externos com detecção de conflitos contra decisões do projeto antes de escrever qualquer coisa.",
  "gsd-inbox": "Triagem e revisão de issues e PRs abertos no GitHub contra modelos do projeto e diretrizes de contribuição.",
  "gsd-ingest-docs": "Inicializa ou mescla uma configuração .planning/ a partir de ADRs, PRDs, SPECs e documentos existentes em um repositório.",
  "gsd-manager": "Centro de comando interativo para gerenciar múltiplas fases a partir de um único terminal",
  "gsd-map-codebase": "Analisa a base de código com agentes mapeadores paralelos para produzir documentos em .planning/codebase/",
  "gsd-milestone-summary": "Gera um resumo abrangente do projeto a partir de artefatos de marco para integração e revisão da equipe",
  "gsd-new-milestone": "Inicia um novo ciclo de marco — atualiza PROJECT.md e roteia para requisitos",
  "gsd-new-project": "Inicializa um novo projeto com coleta profunda de contexto e PROJECT.md",
  "gsd-ns-context": "inteligência da base de código | mapear grafificar documentos aprendizados",
  "gsd-ns-ideate": "captura de exploração | explorar esboçar spike spec capturar",
  "gsd-ns-manage": "configurar espaço de trabalho | fluxos de trabalho thread atualizar enviar inbox",
  "gsd-ns-project": "ciclo de vida do projeto | marcos auditorias resumo",
  "gsd-ns-review": "portões de qualidade | revisão de código debug auditoria segurança avaliação ui",
  "gsd-ns-workflow": "fluxo de trabalho | discutir planejar executar verificar progresso da fase",
  "gsd-pause-work": "Cria entrega de contexto ao pausar o trabalho no meio da fase",
  "gsd-phase": "CRUD para fases em ROADMAP.md — adicionar, inserir, remover ou editar fases",
  "gsd-plan-phase": "Cria plano de fase detalhado (PLAN.md) com loop de verificação",
  "gsd-plan-review-convergence": "Loop de convergência de planos entre IAs — replanejar com feedback de revisão até que não restem preocupações de ALTO risco.",
  "gsd-pr-branch": "Cria uma branch de PR limpa filtrando commits de .planning/ — pronta para revisão de código",
  "gsd-profile-user": "Gera perfil comportamental do desenvolvedor e cria artefatos detectáveis pelo Claude",
  "gsd-progress": "Verifica progresso, avança no fluxo de trabalho ou despacha intenção livre — o comando situacional unificado do GSD",
  "gsd-quick": "Executa uma tarefa rápida com garantias GSD (commits atômicos, rastreamento de estado), mas pula agentes opcionais",
  "gsd-resume-work": "Retoma o trabalho de uma sessão anterior com restauração total de contexto",
  "gsd-review": "Solicita revisão por pares entre IAs de planos de fase a partir de CLIs de IA externas",
  "gsd-review-backlog": "Revisa e promove itens do backlog para o marco ativo",
  "gsd-secure-phase": "Verifica retroativamente as mitigações de ameaças para uma fase concluída",
  "gsd-settings": "Configura alternâncias de fluxo de trabalho do GSD e perfil do modelo",
  "gsd-ship": "Cria PR, executa revisão e prepara para merge após a aprovação na verificação",
  "gsd-sketch": "Esboça ideias de UI/design com mockups HTML descartáveis, ou propõe o que esboçar a seguir (modo frontier)",
  "gsd-spec-phase": "Esclarece O QUE uma fase entrega com pontuação de ambiguidade; produz um SPEC.md antes de discuss-phase.",
  "gsd-spike": "Explora uma ideia através de exploração experimental, ou propõe o que testar a seguir (modo frontier)",
  "gsd-stats": "Exibe estatísticas do projeto — fases, planos, requisitos, métricas git e cronograma",
  "gsd-thread": "Gerencia threads de contexto persistentes para trabalho entre sessões",
  "gsd-ui-phase": "Gera contrato de design de UI (UI-SPEC.md) para fases de frontend",
  "gsd-ui-review": "Auditoria visual retroativa de 6 pilares do código frontend implementado",
  "gsd-ultraplan-phase": "[BETA] Delega a fase de plano para a nuvem ultraplan do Claude Code; revise no navegador e importe de volta.",
  "gsd-undo": "Reversão git segura. Reverte commits de fase ou plano usando o manifesto de fase com verificações de dependência.",
  "gsd-update": "Atualiza o GSD para a versão mais recente com exibição do log de alterações",
  "gsd-validate-phase": "Audita retroativamente e preenche lacunas de validação de Nyquist para uma fase concluída",
  "gsd-verify-work": "Valida funcionalidades construídas através de UAT conversacional",
  "gsd-workspace": "Gerencia espaços de trabalho GSD — criar, listar ou remover ambientes de espaço de trabalho isolados",
  "gsd-workstreams": "Gerencia fluxos de trabalho paralelos — listar, criar, trocar, status, progresso, completar e retomar"
};

Object.entries(translations).forEach(([skill, translatedDesc]) => {
  const skillFile = path.join(baseDir, skill, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    let content = fs.readFileSync(skillFile, 'utf8');
    
    // Replace the description line in the frontmatter
    // Handles description: "...", description: '...', and description: ...
    const newContent = content.replace(/(description:\s*)(["']?)(.*?)(["']?)(\n)/, `$1"$2${translatedDesc}$4"$5`);
    
    // More robust replacement if the above regex is too greedy
    // content = content.split('\n').map(line => {
    //   if (line.startsWith('description:')) {
    //     return `description: "${translatedDesc}"`;
    //   }
    //   return line;
    // }).join('\n');

    // Let's use the line-by-line approach for safety with quotes
    const lines = content.split('\n');
    const updatedLines = lines.map(line => {
      if (line.trim().startsWith('description:')) {
        return `description: "${translatedDesc}"`;
      }
      return line;
    });

    fs.writeFileSync(skillFile, updatedLines.join('\n'), 'utf8');
    console.log(`Updated ${skill}`);
  } else {
    console.warn(`File not found for ${skill}`);
  }
});
