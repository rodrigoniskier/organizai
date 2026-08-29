# OrganizAI Ultimate

PWA offline-first para ChromeOS que analisa arquivos soltos da pasta Downloads, sugere destinos, permite revisão e move os itens selecionados com mecanismos de segurança.

## Recursos Ultimate

- seleção explícita da pasta autorizada pelo usuário;
- funcionamento offline após a primeira carga;
- análise apenas dos arquivos soltos da raiz;
- classificação por extensão, palavras-chave e regras personalizadas;
- pistas opcionais pelo conteúdo de arquivos textuais locais (TXT, MD, CSV, JSON, HTML, XML, YAML), sem upload;
- categorias para documentos, planilhas, apresentações, imagens, vídeos, áudio, compactados, instaladores e código;
- regras contextuais para UNIPÊ, Teologia, Pesquisa, Financeiro e documentos pessoais;
- pré-seleção por nível de confiança;
- revisão individual de destino antes da movimentação;
- busca e filtros por tipo e confiança;
- seleção em massa ou individual;
- modo **Simular**, que mostra o plano sem mover nada;
- criação automática de subpastas;
- opção de organizar também por ano;
- opção de ignorar arquivos recentes e/ou ocultos;
- proteção contra sobrescrita, com renomeação segura quando há conflito;
- cópia com verificação de tamanho antes da remoção do original;
- indicação de duplicados prováveis baseada em tipo e tamanho;
- histórico local;
- desfazer a última operação, persistido localmente;
- criação de regras a partir de correções;
- importação e exportação de regras em JSON;
- preferências persistentes no dispositivo;
- layout responsivo para ChromeOS;
- sem backend obrigatório e sem envio de arquivos para serviços externos.

## Fluxo recomendado

1. Abra a versão publicada via GitHub Pages no ChromeOS e instale-a como aplicativo.
2. Clique em **Escolher Downloads** e autorize a pasta.
3. Clique em **Analisar**.
4. Use filtros e revise principalmente os itens de baixa confiança.
5. Clique em **Simular** para visualizar o plano final.
6. Se estiver correto, clique em **Organizar selecionados**.
7. Em caso de necessidade, use **Desfazer última operação**.

## Segurança

O navegador mantém o controle de permissão da pasta. A aplicação não recebe acesso irrestrito ao Chromebook. Na movimentação, o OrganizAI primeiro copia o arquivo para o destino, fecha a gravação, confirma o tamanho da cópia e só depois remove o arquivo da raiz.

A detecção de “duplicado provável” é deliberadamente conservadora: arquivos de mesmo tamanho e extensão recebem um alerta, mas não são excluídos automaticamente.

## Privacidade

O processamento ocorre no próprio dispositivo. Regras, preferências, histórico e referência à pasta autorizada são mantidos em armazenamento local do navegador. Nenhum documento é enviado para a nuvem pelo OrganizAI.
