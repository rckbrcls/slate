# Arquitetura Definitiva — Editor de Roteiros Profissional macOS
### Stack: Tauri 2.0 + React/TypeScript + Tiptap + Claude Code CLI

> **Objetivo**: App desktop macOS para escrita de roteiros no formato WGA/Hollywood com output profissional idêntico ao Final Draft, integração com Claude Code CLI como agente de edição, e análise narrativa completa. Zero dependência de API externa — apenas o Claude Code CLI instalado localmente.

---

## 1. Stack Definitiva

```
┌─ Frontend ──────────────────────────────────────────────┐
│  React + TypeScript                                      │
│  Tiptap (editor com schema de roteiro)                   │
│  jsdiff (diff visual de edições)                         │
│  D3.js (grafos de personagens, curvas de ritmo)          │
│  fountain-js (parser Fountain)                           │
│  afterwriting (PDF profissional)                         │
└──────────────────┬──────────────────────────────────────┘
                   │ Tauri IPC (invoke / events)
┌─ Backend ────────┴──────────────────────────────────────┐
│  Tauri 2.0 (Rust)                                        │
│  Shell Plugin → Claude Code CLI (processo filho)         │
│  FS Plugin → watch de arquivos .fountain no disco        │
│  macOS menus nativos, auto-update, notificações          │
└──────────────────┬──────────────────────────────────────┘
                   │ spawn / stdout stream
┌─ IA ─────────────┴──────────────────────────────────────┐
│  Claude Code CLI                                         │
│  Roda em background, lê e edita arquivos do disco        │
│  Output capturado via stream-json                        │
│  Sem API, sem chave, sem custo por token                 │
└─────────────────────────────────────────────────────────┘
```

**Por que Tauri 2.0 e não Electron:**
- Bundle 28× menor (8 MB vs 244 MB)
- 2–4× menos uso de memória
- Shell Plugin com streaming de stdout nativo — essencial para capturar o Claude Code em tempo real
- WKWebView usa Safari/WebKit no macOS — comportamento nativo

---

## 2. Formato Profissional WGA/Hollywood — Especificações Completas

O output do app deve ser **indistinguível do Final Draft**. Todas as medidas abaixo são mandatórias.

### 2.1 Página e Fonte

| Parâmetro | Valor |
|---|---|
| Papel | US Letter — 8.5" × 11" |
| Fonte | Courier Prime 12pt (ou Courier New 12pt) |
| Linhas por página | ~55 linhas |
| Regra de tempo | 1 página ≈ 1 minuto de tela |

### 2.2 Margens Exatas por Elemento

| Elemento | Margem Esquerda | Margem Direita | Notas |
|---|---|---|---|
| Scene Heading | 1.5" | 1.0" | ALL CAPS obrigatório |
| Action | 1.5" | 1.0" | Parágrafo normal |
| Character Cue | 3.7" | — | ALL CAPS obrigatório |
| Dialogue | 2.5" | 2.3" | Largura ~3.5" |
| Parenthetical | 3.1" | 2.9" | Entre parênteses |
| Transition | flush right | 1.0" | ALL CAPS + "TO:" |
| Número de página | — | 0.5" do topo | Canto superior direito |

### 2.3 Elementos de Formatação Obrigatórios

**Scene Heading (Slugline):**
```
INT. APARTAMENTO DE MARIA - DIA
EXT. PORTO DE SANTOS - NOITE (FLASHBACK)
INT./EXT. CARRO EM MOVIMENTO - CONTÍNUO
```

**Transições padrão:**
```
FADE IN:          (sempre no início do roteiro)
CUT TO:
DISSOLVE TO:
SMASH CUT TO:
MATCH CUT TO:
FADE OUT.         (sempre no final)
```

**Extensões de personagem:**
```
JOÃO (V.O.)       — voz off, narração
JOÃO (O.S.)       — fora de campo, mesmo espaço
JOÃO (CONT'D)     — continua falando após ação
JOÃO (PRÉ-LAP)    — voz antecipa a cena seguinte
```

### 2.4 Regras de Quebra de Página (Page Break Rules)

Estas são as regras que separam um app profissional de um amador. Implementação obrigatória:

**`(CONT'D)` automático:** Quando um personagem começa a falar em uma página e o diálogo continua na próxima, o app insere automaticamente:
```
                    JOÃO (CONT'D)
```
no topo da página seguinte — sem intervenção do usuário.

**`MORE` e `CONTINUED:`** Ao fim da página onde o diálogo é cortado:
```
                    (MORE)
```
E no rodapé da página (em shooting scripts):
```
CONTINUED:
```

**Widow/Orphan Protection:** O app nunca permite:
- Uma slugline sozinha no final de uma página (sempre puxa pelo menos 2 linhas de action junto)
- A primeira linha de um diálogo no final de uma página
- Uma única linha de action depois de um diálogo longo

**Regra de corte mínimo:** Diálogos só quebram de página se houver pelo menos 2 linhas em cada lado da quebra.

### 2.5 Dual Dialogue

Quando dois personagens falam simultaneamente, o layout é em duas colunas lado a lado:

```
    JOÃO                        MARIA
Você não entende—          Eu entendo tudo—
```

No schema Tiptap, isso é um node `dualDialogue` contendo dois nodes `dialogueColumn`. No PDF, renderizado como duas colunas dentro da margem de diálogo.

### 2.6 Numeração de Cenas (Shooting Script)

Em fase de produção, cenas recebem números em ambos os lados:

```
1.   INT. APARTAMENTO - DIA                                    1.
```

O app tem dois modos: **Draft Mode** (sem numeração) e **Production Mode** (com numeração travada). Uma vez em Production Mode, os números ficam locked — novas cenas recebem sufixos (1A., 1B., etc.).

### 2.7 Sistema de Revisões Coloridas (WGA Color Standard)

Roteiros em produção usam páginas coloridas para indicar revisões. O app controla isso automaticamente:

| Cor | Revisão | Hex |
|---|---|---|
| Branco | Draft original | #FFFFFF |
| Azul | 1ª revisão | #ADD8E6 |
| Rosa | 2ª revisão | #FFB6C1 |
| Amarelo | 3ª revisão | #FFFFE0 |
| Verde | 4ª revisão | #90EE90 |
| Dourado | 5ª revisão | #FFD700 |
| Buff | 6ª revisão | #F0DC82 |
| Salmão | 7ª revisão | #FA8072 |
| Cereja | 8ª revisão | #DC143C |

Páginas alteradas recebem um asterisco `*` na margem direita indicando qual linha mudou.

---

## 3. Formato Fountain — Sintaxe Completa

O arquivo interno do app é sempre `.fountain` — texto puro, legível sem processamento.

### 3.1 Title Page

```fountain
Title: NOME DO ROTEIRO
Credit: Escrito por
Author: Seu Nome
Draft date: 17/03/2026
Contact: seu@email.com
```

### 3.2 Elementos Completos

```fountain
FADE IN:

INT. DELEGACIA - NOITE                          <- Scene Heading

A chuva bate nas janelas. DETECTIVE SILVA,      <- Action
40s, folheia um dossiê.

                    SILVA                       <- Character
          (para si mesmo)                       <- Parenthetical
        Não bate. Nada bate.                    <- Dialogue

                    DELEGADO (O.S.)
        Silva! Na minha sala, agora.

CUT TO:                                         <- Transition

.CENA QUE FORÇA SLUGLINE                        <- Force scene heading

@personagem minúsculo                           <- Force character (mixed case)

> CENTRALIZADO <                                <- Centered text (ex: títulos de ato)

> FADE OUT.                                     <- Transition forçado

= Sinopse desta cena para o outline             <- Synopsis (não aparece no PDF)

# ATO UM                                        <- Section
## Sequência de Abertura                        <- Sub-section

[[Nota do autor que não aparece no PDF]]        <- Note

/* Texto em rascunho, ignorado no output */     <- Boneyard

INT. SALA - DIA #1#                             <- Scene number explícito

JOÃO              ^                             <- Dual dialogue (^ no segundo)
Você foi?

                    MARIA ^
               Fui sim.

===                                             <- Page break forçado
```

### 3.3 Ênfase de Texto

```fountain
*itálico*
**negrito**
***negrito itálico***
_sublinhado_
```

---

## 4. Arquitetura do Editor — Tiptap Schema de Roteiro

### 4.1 Schema de Nodes

Cada elemento do roteiro é um **node tipado** no schema do Tiptap. Isso garante que o app sempre sabe o tipo de cada bloco e pode:
- Aplicar CSS correto (margens exatas WGA)
- Auto-completar corretamente (ex: só sugerir personagens após um scene heading)
- Serializar para Fountain sem ambiguidade
- Contar elementos por tipo para estatísticas

```typescript
// Definição dos nodes do roteiro
const ScreenplaySchema = {
  nodes: {
    // Container raiz
    doc: { content: 'block+' },
    
    // Elementos de roteiro
    sceneHeading: {
      group: 'block',
      content: 'text*',
      attrs: {
        intExt: { default: 'INT.' },   // INT. / EXT. / INT./EXT.
        location: { default: '' },
        timeOfDay: { default: 'DIA' }, // DIA / NOITE / CONTÍNUO / etc.
        sceneNumber: { default: null }, // null em draft, número em production
        forced: { default: false }      // linha começando com ponto (.)
      }
    },
    
    action: {
      group: 'block',
      content: 'inline*',
      attrs: {
        centered: { default: false }   // > texto < no Fountain
      }
    },
    
    character: {
      group: 'block',
      content: 'text*',
      attrs: {
        extension: { default: null },  // V.O. / O.S. / CONT'D / etc.
        forced: { default: false }     // linha começando com @
      }
    },
    
    dialogue: {
      group: 'block',
      content: 'inline*'
    },
    
    parenthetical: {
      group: 'block',
      content: 'text*'
    },
    
    transition: {
      group: 'block',
      content: 'text*',
      attrs: {
        forced: { default: false }    // linha começando com >
      }
    },
    
    dualDialogue: {
      group: 'block',
      content: 'dualDialogueColumn dualDialogueColumn'
    },
    
    dualDialogueColumn: {
      content: 'character dialogue+'
    },
    
    pageBreak: {
      group: 'block',
      atom: true  // sem conteúdo interno
    },
    
    // Elementos de estrutura (não aparecem no PDF)
    section: {
      group: 'block',
      content: 'text*',
      attrs: { level: { default: 1 } }  // # = 1, ## = 2, ### = 3
    },
    
    synopsis: {
      group: 'block',
      content: 'text*'    // = texto no Fountain
    },
    
    note: {
      group: 'block',
      content: 'text*'    // [[ texto ]] no Fountain
    }
  }
}
```

### 4.2 CSS das Margens WGA

```css
/* Base: Courier Prime 12pt, US Letter simulado */
.screenplay-editor {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 12pt;
  line-height: 1.0;                /* espaçamento simples */
  width: 8.5in;
  min-height: 11in;
  padding: 1in 1in 1in 1.5in;     /* top right bottom left */
  background: white;
  color: black;
}

[data-type="scene-heading"] {
  margin-left: 0;
  margin-right: 0;
  text-transform: uppercase;
  margin-top: 1em;
  margin-bottom: 0;
}

[data-type="action"] {
  margin-left: 0;
  margin-right: 0;
  margin-top: 0.5em;
}

[data-type="character"] {
  margin-left: 2.2in;              /* 3.7" - 1.5" de padding */
  text-transform: uppercase;
  margin-bottom: 0;
}

[data-type="dialogue"] {
  margin-left: 1.0in;             /* 2.5" - 1.5" de padding */
  margin-right: 1.3in;            /* 2.3" da direita */
  margin-top: 0;
  margin-bottom: 0;
}

[data-type="parenthetical"] {
  margin-left: 1.6in;             /* 3.1" - 1.5" de padding */
  margin-right: 1.4in;
  margin-top: 0;
  margin-bottom: 0;
}

[data-type="transition"] {
  text-align: right;
  margin-right: 0;
  text-transform: uppercase;
  margin-top: 1em;
}

[data-type="dual-dialogue"] {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5in;
  margin-left: 0;
}

/* Modo Print — para geração de PDF via Puppeteer */
@media print {
  .screenplay-editor {
    width: 8.5in;
    height: 11in;
    padding: 1in 1in 1in 1.5in;
    page-break-after: always;
  }
  
  [data-type="scene-heading"] {
    page-break-after: avoid;    /* nunca quebra página após slugline */
  }
  
  [data-type="character"] {
    page-break-after: avoid;    /* nunca fica sozinho no final */
  }
}
```

### 4.3 Auto-complete Inteligente

O editor detecta o contexto e sugere completions automaticamente:

```typescript
const ScreenplayAutocomplete = Extension.create({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            const { selection, doc } = view.state
            const currentNode = doc.nodeAt(selection.$from.pos)
            
            // Tab avança para o próximo elemento lógico
            if (event.key === 'Tab') {
              const nextType = getNextElementType(currentNode.type.name)
              convertCurrentNode(view, nextType)
              return true
            }
            
            // Enter no Character → vai para Dialogue
            if (event.key === 'Enter' && currentNode.type.name === 'character') {
              insertNodeAfter(view, 'dialogue')
              return true
            }
            
            // Enter no Dialogue → sugere Parenthetical ou novo Character
            // Enter na Action → sugere Scene Heading ou Character
          }
        }
      })
    ]
  }
})

// Lógica de progressão de elementos
function getNextElementType(current: string): string {
  const flow = {
    'sceneHeading': 'action',
    'action': 'character',
    'character': 'dialogue',
    'dialogue': 'action',
    'parenthetical': 'dialogue',
    'transition': 'sceneHeading'
  }
  return flow[current] || 'action'
}
```

### 4.4 Sugestões de Auto-complete por Tipo

```typescript
// Personagens: coleta do documento atual
function getCharacterSuggestions(doc: Node): string[] {
  const characters = new Set<string>()
  doc.descendants(node => {
    if (node.type.name === 'character') {
      characters.add(node.textContent.replace(/\s*\(.*\)/, '').trim())
    }
  })
  return Array.from(characters).sort()
}

// Scene Headings: coleta locações já usadas
function getLocationSuggestions(doc: Node): string[] {
  const locations = new Set<string>()
  doc.descendants(node => {
    if (node.type.name === 'sceneHeading') {
      locations.add(node.attrs.location)
    }
  })
  return Array.from(locations)
}

// Prefixos de slugline
const SLUGLINE_PREFIXES = ['INT.', 'EXT.', 'INT./EXT.', 'EST.', 'I/E.']
const TIME_OF_DAY = ['DIA', 'NOITE', 'MANHÃ', 'TARDE', 'ENTARDECER', 'AMANHECER', 'CONTÍNUO', 'MAIS TARDE']
const TRANSITIONS = ['CUT TO:', 'DISSOLVE TO:', 'SMASH CUT TO:', 'MATCH CUT TO:', 'FADE OUT.', 'FADE TO BLACK.']
```

---

## 5. Serialização: Editor ↔ Fountain ↔ PDF

### 5.1 Editor → Fountain (serializar)

```typescript
function editorToFountain(doc: Node): string {
  let fountain = ''
  
  doc.descendants((node) => {
    const text = node.textContent
    
    switch (node.type.name) {
      case 'sceneHeading':
        fountain += '\n'
        if (node.attrs.forced) fountain += '.'
        fountain += `${node.attrs.intExt} ${node.attrs.location} - ${node.attrs.timeOfDay}`
        if (node.attrs.sceneNumber) fountain += ` #${node.attrs.sceneNumber}#`
        fountain += '\n'
        break
        
      case 'action':
        fountain += '\n' + text + '\n'
        break
        
      case 'character':
        fountain += '\n'
        if (node.attrs.forced) fountain += '@'
        fountain += text.toUpperCase()
        if (node.attrs.extension) fountain += ` (${node.attrs.extension})`
        fountain += '\n'
        break
        
      case 'dialogue':
        fountain += text + '\n'
        break
        
      case 'parenthetical':
        fountain += `(${text})\n`
        break
        
      case 'transition':
        fountain += '\n' + text.toUpperCase() + '\n'
        break
        
      case 'pageBreak':
        fountain += '\n===\n'
        break
        
      case 'section':
        const hashes = '#'.repeat(node.attrs.level)
        fountain += `\n${hashes} ${text}\n`
        break
        
      case 'synopsis':
        fountain += `= ${text}\n`
        break
        
      case 'note':
        fountain += `[[${text}]]\n`
        break
    }
  })
  
  return fountain.trim()
}
```

### 5.2 Fountain → Editor (deserializar)

```typescript
import { parse } from 'fountain-js'

function fountainToEditor(fountainText: string): JSONContent {
  const parsed = parse(fountainText, { tokens: true })
  const content: JSONContent[] = []
  
  for (const token of parsed.tokens) {
    switch (token.type) {
      case 'scene_heading':
        const parts = parseSlugline(token.text)
        content.push({
          type: 'sceneHeading',
          attrs: {
            intExt: parts.intExt,
            location: parts.location,
            timeOfDay: parts.timeOfDay,
            sceneNumber: token.scene_number || null
          },
          content: [{ type: 'text', text: token.text }]
        })
        break
        
      case 'action':
        content.push({
          type: 'action',
          content: [{ type: 'text', text: token.text }]
        })
        break
        
      case 'character':
        content.push({
          type: 'character',
          attrs: { extension: parseExtension(token.text) },
          content: [{ type: 'text', text: stripExtension(token.text) }]
        })
        break
        
      case 'dialogue':
        content.push({
          type: 'dialogue',
          content: [{ type: 'text', text: token.text }]
        })
        break
        
      case 'parenthetical':
        content.push({
          type: 'parenthetical',
          content: [{ type: 'text', text: token.text.replace(/^\(|\)$/g, '') }]
        })
        break
        
      case 'transition':
        content.push({
          type: 'transition',
          content: [{ type: 'text', text: token.text }]
        })
        break
    }
  }
  
  return { type: 'doc', content }
}
```

### 5.3 Geração de PDF Profissional

O PDF usa **Puppeteer dentro do Tauri** renderizando o HTML do editor com CSS de impressão. Isso garante output pixel-perfect porque usa o mesmo layout visual do editor.

```typescript
async function generatePDF(screenplayPath: string, outputPath: string) {
  const html = renderScreenplayToHTML(fountainText)
  await writeFile('/tmp/screenplay_render.html', html)
  
  const puppeteer = Command.create('puppeteer-export', [
    '/tmp/screenplay_render.html',
    outputPath,
    '--format=Letter',
    '--margin-top=1in',
    '--margin-right=1in', 
    '--margin-bottom=1in',
    '--margin-left=1.5in',
    '--print-background=false'
  ])
  
  await puppeteer.execute()
}
```

**Configurações do PDF:**
- Papel: US Letter (8.5" × 11")
- Fonte embedada: Courier Prime (garantia que qualquer máquina renderiza igual)
- Margens exatas WGA
- Numeração de página automática no canto superior direito
- Title page separada sem numeração
- `(CONT'D)` e `MORE` inseridos automaticamente pelo algoritmo de paginação antes de gerar

### 5.4 Algoritmo de Paginação Automática

Antes de gerar o PDF, o app executa o algoritmo de paginação que resolve todas as quebras:

```typescript
function paginateScreenplay(tokens: ScreenplayToken[]): PaginatedScreenplay {
  const LINES_PER_PAGE = 55
  let currentLine = 0
  let currentPage = 1
  const pages: Page[] = [{ number: 1, tokens: [] }]
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const tokenLines = estimateLines(token)
    
    if (currentLine + tokenLines > LINES_PER_PAGE) {
      
      // Widow protection: slugline nunca fica sozinha no final
      if (token.type === 'scene_heading') {
        breakPage()
      }
      
      // Character nunca fica sozinho no final (sem dialogue)
      else if (token.type === 'character') {
        breakPage()
      }
      
      // Diálogo que cruza página: inserir MORE/CONT'D
      else if (token.type === 'dialogue') {
        const linesRemaining = LINES_PER_PAGE - currentLine
        
        if (linesRemaining >= 2) {
          const [part1, part2] = splitDialogue(token, linesRemaining - 1)
          addToken(part1)
          addToken({ type: 'more', text: '(MORE)' })
          breakPage()
          
          // Repete o Character com (CONT'D)
          const charToken = findPrecedingCharacter(tokens, i)
          addToken({ ...charToken, extension: "CONT'D" })
          addToken(part2)
        } else {
          breakPage()
          addToken(findPrecedingCharacter(tokens, i))
          addToken(token)
        }
      }
      
      else {
        breakPage()
        addToken(token)
      }
    } else {
      addToken(token)
    }
  }
  
  return pages
}
```

### 5.5 Export para FDX (Final Draft XML)

```typescript
function exportToFDX(doc: Node): string {
  let fdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>\n`
  
  doc.descendants((node) => {
    const type = fdxTypeMap[node.type.name]
    if (!type) return
    
    fdx += `    <Paragraph Type="${type}">\n`
    fdx += `      <Text>${escapeXML(node.textContent)}</Text>\n`
    fdx += `    </Paragraph>\n`
  })
  
  fdx += `  </Content>\n</FinalDraft>`
  return fdx
}

const fdxTypeMap: Record<string, string> = {
  'sceneHeading':  'Scene Heading',
  'action':        'Action',
  'character':     'Character',
  'dialogue':      'Dialogue',
  'parenthetical': 'Parenthetical',
  'transition':    'Transition',
}
```

---

## 6. Integração com Claude Code CLI

### 6.1 Princípio Fundamental

**Sem API. Sem chave. Sem custo por token.**

O app spawna o Claude Code CLI como um processo filho invisível. O Claude Code lê o arquivo `.fountain` do disco, edita, e o app detecta a mudança e mostra o diff.

```
Usuário digita instrução no chat lateral
        ↓
App salva o roteiro atual em screenplay.fountain no disco
        ↓
Tauri spawna: claude --print --output-format stream-json "instrução"
        ↓
Claude Code lê o arquivo, processa, edita
        ↓
FS watcher detecta que screenplay.fountain mudou
        ↓
App lê a versão nova, computa diff com o original
        ↓
Editor exibe mudanças em verde (adicionado) / vermelho (removido)
        ↓
Usuário aceita ou rejeita cada mudança
```

### 6.2 Implementação no Tauri (Rust)

```rust
// src-tauri/src/claude.rs
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn run_claude_code(
    app: tauri::AppHandle,
    instruction: String,
    screenplay_dir: String,
) -> Result<(), String> {
    let shell = app.shell();
    
    let (mut rx, _child) = shell
        .command("claude")
        .args([
            "--print",
            "--output-format", "stream-json",
            "--allowedTools", "Read,Write,Edit",
            &instruction,
        ])
        .current_dir(&screenplay_dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    
    // Emite eventos para o frontend em tempo real
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line).to_string();
                app.emit("claude-output", &text).ok();
            }
            CommandEvent::Stderr(line) => {
                let text = String::from_utf8_lossy(&line).to_string();
                app.emit("claude-error", &text).ok();
            }
            CommandEvent::Terminated(payload) => {
                app.emit("claude-done", payload.code).ok();
                break;
            }
            _ => {}
        }
    }
    
    Ok(())
}
```

### 6.3 Implementação no Frontend (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

async function runClaude(instruction: string) {
  // 1. Salva versão atual no disco antes de chamar o Claude
  const originalContent = editorToFountain(editor.getJSON())
  await writeTextFile(screenplayPath, originalContent)
  
  // 2. Atualiza UI para estado "rodando"
  setClaudeStatus('running')
  setClaudeLog([])
  
  // 3. Escuta o output em tempo real (mostra progresso no painel)
  const unlistenOutput = await listen<string>('claude-output', (event) => {
    setClaudeLog(prev => [...prev, event.payload])
  })
  
  // 4. Quando o Claude terminar
  const unlistenDone = await listen('claude-done', async () => {
    setClaudeStatus('reviewing')
    
    // Lê o arquivo que o Claude editou
    const editedContent = await readTextFile(screenplayPath)
    
    // Mostra o diff no editor
    showDiffInEditor(originalContent, editedContent)
    
    unlistenOutput()
    unlistenDone()
  })
  
  // 5. Dispara o Claude Code
  await invoke('run_claude_code', {
    instruction,
    screenplayDir: dirname(screenplayPath)
  })
}
```

### 6.4 Visualização do Diff no Editor

```typescript
import { diffLines } from 'diff'

function showDiffInEditor(original: string, edited: string) {
  const changes = diffLines(original, edited)
  
  // Converte o Fountain editado para o schema do Tiptap
  const newDoc = fountainToEditor(edited)
  
  // Aplica o conteúdo novo com decorações de diff
  editor.commands.setContent(newDoc, false)
  
  // Registra as mudanças para accept/reject
  editor.storage.aiDiff = {
    original,
    edited,
    changes,
    pending: changes.filter(c => c.added || c.removed)
  }
  
  // Aplica highlight visual
  applyDiffDecorations(editor, changes)
}

function applyDiffDecorations(editor: Editor, changes: Change[]) {
  // Adições: background verde claro
  // Remoções: tachado + fundo vermelho claro
  // Implementado via ProseMirror Decorations
}
```

### 6.5 UI do Chat Lateral (AISidePanel)

```typescript
function AISidePanel() {
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'reviewing'>('idle')
  const [log, setLog] = useState<string[]>([])
  
  return (
    <aside className="ai-panel">
      <header>
        <h3>Claude Code</h3>
        <StatusBadge status={status} />
      </header>
      
      {/* Quick actions */}
      {status === 'idle' && (
        <div className="quick-actions">
          {QUICK_ACTIONS.map(action => (
            <button key={action.label} onClick={() => runClaude(action.instruction)}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Log em tempo real */}
      {status === 'running' && (
        <div className="claude-log">
          <Spinner />
          {log.slice(-5).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
      
      {/* Accept/Reject quando há diff */}
      {status === 'reviewing' && (
        <div className="diff-controls">
          <button className="accept" onClick={() => editor.commands.acceptAllChanges()}>
            ✓ Aceitar todas as mudanças
          </button>
          <button className="reject" onClick={() => editor.commands.rejectAllChanges()}>
            ✕ Rejeitar todas as mudanças
          </button>
        </div>
      )}
      
      {/* Input de instrução */}
      <div className="instruction-input">
        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="Ex: Reescreve a cena 3 com mais tensão e menos exposição..."
          onKeyDown={e => {
            if (e.key === 'Enter' && e.metaKey) runClaude(instruction)
          }}
          disabled={status === 'running'}
          rows={4}
        />
        <button
          onClick={() => runClaude(instruction)}
          disabled={status === 'running' || !instruction.trim()}
        >
          {status === 'running' ? 'Rodando...' : 'Enviar  ⌘↵'}
        </button>
      </div>
    </aside>
  )
}
```

### 6.6 Quick Actions — Instruções Prontas

```typescript
const QUICK_ACTIONS = [
  {
    label: "📋 Analisar roteiro completo",
    instruction: "Leia o arquivo screenplay.fountain e me dê uma análise profissional da estrutura narrativa em 3 atos, desenvolvimento dos personagens, ritmo das cenas e 5 sugestões específicas de melhoria."
  },
  {
    label: "💬 Melhorar diálogos",
    instruction: "Leia screenplay.fountain e reescreva os diálogos para soarem mais naturais, com voz distinta para cada personagem e menos exposição (show, don't tell)."
  },
  {
    label: "✅ Verificar formato WGA",
    instruction: "Leia screenplay.fountain e corrija qualquer elemento fora do formato profissional WGA: sluglines, cues de personagem, transições, parentéticos. Não altere o conteúdo narrativo."
  },
  {
    label: "⚡ Fortalecer segundo ato",
    instruction: "Leia screenplay.fountain e reestruture o segundo ato para ter mais conflito, stakes mais altos, um midpoint mais impactante e menos cenas de filler."
  },
  {
    label: "🎭 Análise de personagens",
    instruction: "Leia screenplay.fountain e analise o arco de cada personagem principal: onde começam, como mudam, e se o desenvolvimento é consistente ao longo do roteiro."
  },
  {
    label: "⏱️ Cortar para 90 páginas",
    instruction: "Leia screenplay.fountain. Se o roteiro passar de 95 páginas, identifique e remova cenas redundantes, diálogos excessivos e sequências que não movem a história."
  },
  {
    label: "🔍 Verificar Bechdel Test",
    instruction: "Leia screenplay.fountain e analise se o roteiro passa no Bechdel Test. Liste as cenas entre personagens femininas e sobre o que falam."
  },
  {
    label: "🌍 Consistência do mundo",
    instruction: "Leia screenplay.fountain e verifique consistências: nomes de personagens, locações, linha do tempo, e detalhes do mundo estabelecidos nas primeiras páginas."
  }
]
```

---

## 7. Sistema de Análise Estatística e Narrativa

### 7.1 Métricas em Tempo Real

Calculadas continuamente conforme o usuário escreve:

```typescript
function calculateStats(doc: Node): ScreenplayStats {
  let sceneCount = 0, dialogueWords = 0, actionWords = 0
  let intCount = 0, extCount = 0, dayCount = 0, nightCount = 0
  const characters = new Map<string, CharacterStats>()
  let currentChar: string | null = null
  
  doc.descendants((node) => {
    switch (node.type.name) {
      case 'sceneHeading':
        sceneCount++
        if (node.attrs.intExt.includes('INT')) intCount++
        if (node.attrs.intExt.includes('EXT')) extCount++
        if (node.attrs.timeOfDay === 'DIA') dayCount++
        if (node.attrs.timeOfDay === 'NOITE') nightCount++
        currentChar = null
        break
        
      case 'character':
        currentChar = node.textContent.trim().replace(/\s*\(.*\)/, '')
        if (!characters.has(currentChar)) {
          characters.set(currentChar, { name: currentChar, scenes: new Set(), words: 0, lines: 0 })
        }
        characters.get(currentChar)!.scenes.add(sceneCount)
        break
        
      case 'dialogue':
        dialogueWords += countWords(node.textContent)
        if (currentChar && characters.has(currentChar)) {
          characters.get(currentChar)!.words += countWords(node.textContent)
          characters.get(currentChar)!.lines++
        }
        break
        
      case 'action':
        actionWords += countWords(node.textContent)
        currentChar = null
        break
    }
  })
  
  const estimatedMinutes = estimateScreenTime(doc)
  const totalWords = dialogueWords + actionWords
  
  return {
    pages: Math.round(estimatedMinutes * 10) / 10,
    estimatedRuntime: formatMinutes(estimatedMinutes),
    sceneCount,
    dialogueRatio: dialogueWords / totalWords,
    actionRatio: actionWords / totalWords,
    intRatio: intCount / (intCount + extCount),
    dayRatio: dayCount / (dayCount + nightCount),
    characters: Array.from(characters.values())
      .sort((a, b) => b.words - a.words)
  }
}
```

### 7.2 Estimativa de Tempo de Tela

```typescript
function estimateScreenTime(doc: Node): number {
  let minutes = 0
  
  doc.descendants((node) => {
    switch (node.type.name) {
      case 'dialogue':
        // 150 palavras por minuto (velocidade natural de fala)
        minutes += countWords(node.textContent) / 150
        break
      case 'parenthetical':
        minutes += 2 / 60   // ~2 segundos por parentético
        break
      case 'action':
        const lines = Math.ceil(countWords(node.textContent) / 10)
        minutes += (lines * 4) / 60   // ~4 segundos por linha de ação
        break
      case 'sceneHeading':
        minutes += 3 / 60   // overhead de troca de cena
        break
      case 'transition':
        minutes += 2 / 60
        break
    }
  })
  
  return minutes
}
```

### 7.3 Análise de Personagens

```typescript
function analyzeCharacters(doc: Node): CharacterAnalysis[] {
  // ... (coleta de co-ocorrências por cena)
  
  return characters.map((char, i) => ({
    ...char,
    rank: i + 1,
    isProtagonist: i === 0,
    wordsPercent: (char.words / totalDialogueWords) * 100,
    scenePercent: (char.scenes.size / totalScenes) * 100,
    avgWordsPerScene: char.words / char.scenes.size,
    firstAppearance: char.firstScene,
    gender: detectGender(char.name)  // heurística + dicionário
  }))
}
```

### 7.4 Grafo de Relacionamentos (D3.js)

```typescript
function buildCharacterGraph(characters: CharacterAnalysis[]) {
  const nodes = characters.map(char => ({
    id: char.name,
    radius: Math.sqrt(char.words) * 0.4,
    isProtagonist: char.isProtagonist,
    gender: char.gender
  }))
  
  // Arestas = co-ocorrência em cenas
  const links = buildCoOccurrenceLinks(characters)
  
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).strength(d => d.weight * 0.3))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.radius + 15))
}
```

### 7.5 Análise de Ritmo (Pacing Chart)

```typescript
function analyzePacing(doc: Node): PacingData[] {
  const pacingByPage: PacingData[] = []
  // ... agrupa tokens por página (55 linhas)
  // ... calcula ratio diálogo/ação por página
  // ... calcula intensidade (0 = só diálogo, 1 = só ação)
  return pacingByPage
}
```

Renderizado como gráfico de área no D3.js, mostrando o fluxo de tensão do roteiro página a página.

### 7.6 Save the Cat — Beat Sheet Overlay

```typescript
const SAVE_THE_CAT_BEATS = [
  { name: 'Opening Image',      pagePercent: 0.01 },
  { name: 'Theme Stated',       pagePercent: 0.05 },
  { name: 'Set-Up',             pagePercent: 0.10 },
  { name: 'Catalyst',           pagePercent: 0.12 },
  { name: 'Debate',             pagePercent: 0.23 },
  { name: 'Break into Two',     pagePercent: 0.25 },
  { name: 'B Story',            pagePercent: 0.30 },
  { name: 'Fun and Games',      pagePercent: 0.50 },
  { name: 'Midpoint',           pagePercent: 0.50 },
  { name: 'Bad Guys Close In',  pagePercent: 0.68 },
  { name: 'All Is Lost',        pagePercent: 0.75 },
  { name: 'Dark Night of Soul', pagePercent: 0.77 },
  { name: 'Break into Three',   pagePercent: 0.85 },
  { name: 'Finale',             pagePercent: 0.99 },
  { name: 'Final Image',        pagePercent: 1.00 },
]

// Overlay visual na barra lateral ou como régua abaixo do editor
// Mostra onde cada beat deveria estar e permite ao Claude analisar
```

### 7.7 Bechdel Test Automático

```typescript
function bechdelTest(doc: Node, characters: CharacterAnalysis[]): BechdelResult {
  const femaleChars = characters.filter(c => c.gender === 'female').map(c => c.name)
  
  // Critério 1: há pelo menos 2 personagens femininas?
  const hasTwo = femaleChars.length >= 2
  
  // Critério 2: elas conversam entre si?
  let talkToEachOther = false
  let aboutSomethingElse = false
  
  // Analisa sequências de diálogo entre personagens femininas
  // Se duas femininas falam em sequência na mesma cena → passa critério 2
  // Se o conteúdo não menciona nomes masculinos → passa critério 3
  
  return {
    passes: hasTwo && talkToEachOther && aboutSomethingElse,
    femaleCharacters: femaleChars,
    hasTwo,
    talkToEachOther,
    aboutSomethingElse,
    scenesWithFemaleDialogue: []  // lista das cenas
  }
}
```

### 7.8 Legibilidade dos Diálogos (Flesch-Kincaid)

```typescript
import syllable from 'syllable'

function analyzeReadability(text: string) {
  const words = text.split(/\s+/).filter(Boolean)
  const sentences = text.split(/[.!?]+/).filter(Boolean)
  const totalSyllables = words.reduce((sum, word) => sum + syllable(word), 0)
  
  const fleschEase = 206.835
    - 1.015 * (words.length / sentences.length)
    - 84.6 * (totalSyllables / words.length)
  
  const fkGrade = 0.39 * (words.length / sentences.length)
    + 11.8 * (totalSyllables / words.length)
    - 15.59
  
  // Ideal para roteiros: grade 5-8, ease > 60
  return { fleschEase, fkGrade, isIdeal: fkGrade >= 5 && fkGrade <= 8 }
}
```

---

## 8. Painel de Estatísticas — Layout

```
┌─ ROTEIRO ─────────────────────────────────────┐
│  Páginas:          98.3                        │
│  Tempo estimado:   1h 38min                    │
│  Cenas:            67                          │
│  Palavras:         22.840                      │
├─ PROPORÇÃO ───────────────────────────────────┤
│  Diálogo:  ████████░░  62%                     │
│  Ação:     ████░░░░░░  38%                     │
│  INT/EXT:  ██████░░░░  INT 71%                 │
│  Dia/Noite: ████░░░░░  Dia 52%                 │
├─ PERSONAGENS ─────────────────────────────────┤
│  1. MARCOS    ████████  320 falas  4.200 words │
│  2. LAURA     ██████░░  215 falas  2.800 words │
│  3. DR. LIMA  ████░░░░   98 falas  1.100 words │
│  + 8 outros...                                 │
├─ BECHDEL TEST ────────────────────────────────┤
│  ✓ Há 2+ personagens femininas                 │
│  ✓ Conversam entre si (3 cenas)               │
│  ✓ Falam sobre algo além de homens            │
│  PASSA ✓                                       │
├─ LEGIBILIDADE ────────────────────────────────┤
│  Flesch Ease:  74  (Fácil ✓)                   │
│  Grade Level:  6.2 (Ideal ✓)                   │
└───────────────────────────────────────────────┘
```

---

## 9. Estrutura do Projeto

```
screenplay-app/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # entry point Tauri
│   │   ├── claude.rs            # spawn Claude Code CLI
│   │   ├── file_ops.rs          # leitura/escrita de arquivos
│   │   └── pdf.rs               # integração Puppeteer para PDF
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/
│   ├── editor/
│   │   ├── schema.ts            # nodes Tiptap do roteiro
│   │   ├── extensions/
│   │   │   ├── autocomplete.ts  # sugestão personagens/sluglines
│   │   │   ├── shortcuts.ts     # Tab/Enter entre elementos
│   │   │   ├── pagebreak.ts     # quebras de página visuais
│   │   │   └── ai-diff.ts       # diff das edições do Claude
│   │   ├── serializer/
│   │   │   ├── toFountain.ts
│   │   │   ├── fromFountain.ts
│   │   │   └── toFDX.ts
│   │   └── pagination.ts        # CONT'D / MORE / widow protection
│   │
│   ├── ai/
│   │   ├── claude.ts            # invoke Tauri + listen events
│   │   ├── diff.ts              # jsdiff + decorações no editor
│   │   └── quickActions.ts      # instruções prontas
│   │
│   ├── analytics/
│   │   ├── stats.ts
│   │   ├── characters.ts
│   │   ├── pacing.ts
│   │   ├── beatsheet.ts
│   │   ├── readability.ts
│   │   └── bechdel.ts
│   │
│   ├── ui/
│   │   ├── Editor.tsx
│   │   ├── AISidePanel.tsx
│   │   ├── StatsSidePanel.tsx
│   │   ├── CharacterGraph.tsx
│   │   ├── PacingChart.tsx
│   │   └── BeatSheetOverlay.tsx
│   │
│   └── App.tsx
│
└── package.json
```

---

## 10. Dependências

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tiptap/react": "^2.7.0",
    "@tiptap/pm": "^2.7.0",
    "@tiptap/starter-kit": "^2.7.0",
    "@tiptap/extension-placeholder": "^2.7.0",
    "fountain-js": "^1.2.4",
    "diff": "^5.2.0",
    "d3": "^7.9.0",
    "syllable": "^5.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "puppeteer": "^22.0.0"
  }
}
```

---

## 11. Checklist — Output 100% Profissional

**Formatação WGA:**
- [x] Courier Prime 12pt embedada no PDF _(Fase 1C: fontes instaladas, CSS aplicado no editor)_
- [x] Margens exatas em todos os elementos _(Fase 1C: screenplay.css com margens WGA)_
- [x] Scene Headings e Character Cues em ALL CAPS automático _(Fase 1C: text-transform uppercase via CSS)_
- [x] `(CONT'D)` automático em quebras de diálogo por página _(Fase 2: pagination.ts — contdCharacter no PageBreakInfo)_
- [x] `(MORE)` automático no fim de página _(Fase 2: pagination.ts — more flag no PageBreakInfo)_
- [x] Widow protection para sluglines e characters _(Fase 2: pagination.ts — orphan/widow prevention logic)_
- [x] Dual dialogue em duas colunas lado a lado _(Fase 1B: DualDialogue node + CSS grid)_
- [x] Numeração de página (sem número na página 1) _(Fase 2: PageNumbers.ts — decorações ProseMirror no gutter)_
- [x] Title page separada e não numerada _(Fase 2: TitlePageView.tsx — view formatada com metadados)_
- [x] Transições alinhadas à direita _(Fase 1C: text-align right via CSS)_

**Editor Core (Fase 1 — concluída 2025-03-17):**
- [x] Tauri 2.0 setup com plugins fs, dialog, shell _(Fase 1A)_
- [x] Tiptap com schema completo de roteiro (13 node types) _(Fase 1B)_
- [x] Keyboard navigation: Tab cycle + Enter contextual _(Fase 1D)_
- [x] Serialização Fountain bidirecional (serialize + deserialize) _(Fase 1E)_
- [x] Autocomplete de personagens, locações e transições _(Fase 1F)_
- [x] Operações de arquivo: Novo, Abrir, Salvar, Salvar Como _(Fase 1G)_
- [x] Atalhos globais: Cmd+N, Cmd+O, Cmd+S, Cmd+Shift+S _(Fase 1G)_
- [x] Dirty state tracking com indicador visual _(Fase 1G)_

**Paginação e Estatísticas (Fase 2 — concluída 2026-03-17):**
- [x] Algoritmo de paginação WGA: 55 linhas/pg, word-wrap por tipo de elemento _(pagination.ts)_
- [x] Forced markers round-trip: `.SCENE`, `@CHAR`, `> TRANSITION` preservados _(deserialize.ts)_
- [x] Dual dialogue parsing: tokens `dual_dialogue_begin/end` → nós `dualDialogue` _(deserialize.ts)_
- [x] Centered action formato correto `> TEXT <` _(serialize.ts)_ + token `centered` _(deserialize.ts)_
- [x] Inline formatting (bold/italic/underline) preservada em action e dialogue _(serialize.ts + deserialize.ts)_
- [x] Error handling tipado em fileService.ts com feedback visual _(fileService.ts, useDocument.ts, App.tsx)_
- [x] Barra de estatísticas colapsável: páginas, tempo, cenas, palavras, ratio, personagens _(StatsBar.tsx, stats.ts)_
- [x] 24 testes unitários: paginação, stats, serialização/deserialização round-trip _(pagination.test.ts, stats.test.ts, serialize.test.ts)_

**Modos de Produção:**
- [ ] Draft Mode vs Production Mode (scene number lock)
- [ ] Sistema de revisões coloridas WGA (8 cores)
- [ ] Asteriscos de revisão na margem direita
- [ ] Export PDF profissional via pdfmake _(decisão: pdfmake, não Puppeteer — bundle menor, Tauri-friendly)_
- [ ] Export FDX (Final Draft)
- [x] Export Fountain (nativo) _(Fase 1E: serialização Fountain completa)_

**IA — Claude Code CLI:**
- [ ] Claude Code roda em background sem terminal visível
- [ ] Arquivo `.fountain` salvo antes de cada chamada
- [ ] Log de progresso em tempo real no painel lateral
- [ ] Diff verde/vermelho no editor após edição
- [ ] Accept/Reject global e por trecho
- [ ] Quick Actions prontas para ações comuns

**Análise Narrativa:**
- [x] Contagem de páginas com estimativa de tempo de tela _(Fase 2: stats.ts — 1 pg ≈ 1 min)_
- [x] Ratio diálogo/ação por página e total _(Fase 2: stats.ts — dialogueRatio)_
- [ ] Distribuição de personagens (falas, palavras, cenas)
- [ ] Grafo de relacionamentos D3.js
- [ ] Gráfico de ritmo (pacing) por página
- [ ] Overlay do Save the Cat beat sheet
- [ ] Bechdel Test automático
- [ ] Flesch-Kincaid por personagem e geral
