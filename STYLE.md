# STYLE.md — reels de ciência "E se…?" (padrão INEMA)

Cole este arquivo na pasta do reel e diga ao Claude: `Use o STYLE.md para o visual.`
Todos os valores vêm do código do motor (`motor/reel.css`, `motor/base.js`).

## Formato
- Vertical 1080 × 1920, 30 fps, 55 a 70 s (acima de 1 min ajuda no TikTok; no Instagram Reels cabe até 3 min).
- Uma pergunta "E se…?" = o título. O quadro 0 mostra o título (é a capa).
- Os últimos ~2 s repetem o quadro 0 (mesmo título, mesma câmera, mesmos números no aparelho): o reel volta ao começo sem emenda.

## A ideia do visual
Um só mundo 3D, com duas aparências dos mesmos objetos, trocadas pelo aparelho:
- **REAL** = o mundo de hoje (primeiros segundos e a volta): low-poly, sombra macia, luz do dia.
- **E SE** = o mundo mudado: os mesmos objetos como planta técnica azul (preenchimento `#2B4462`/`#35557A`, arestas `#C4E2FF`, luz própria leve).
- **Uma só cor quente**: o amarelo INEMA `#FACC15`, só na coisa principal da história (o Sol, o eixo, o número do aparelho, os números dos cartões, a palavra-chave da legenda).

## Cores
| Papel | Hex |
|---|---|
| Amarelo INEMA (único acento) | `#FACC15` (letra sobre ele: `#1A1206`) |
| Fundo / painéis | `#0C0C10`, painel `rgba(12,12,16,.74)`, borda `rgba(156,195,230,.30)` |
| Texto | `#FFFFFF`; secundário `rgba(255,255,255,.78)` |
| E SE — preenchimento | `#2B4462`, `#35557A` |
| E SE — arestas e grade | `#C4E2FF` |
| E SE — céu | `#0D1828` (topo) → `#2A4A6C` (horizonte) |
| Espaço | `#05070C` + estrelas fixas (sem brilho) |
| Trilho de barra | `#161C26` |

## Fontes (locais, em `motor/fontes/`)
| Uso | Fonte | Tamanho |
|---|---|---|
| Título (capa) | Sora 800 | 104 px, entrelinha 1,04 |
| Legenda | Montserrat Black, caixa alta, contorno preto 9 px | 76 px |
| Aparelho e números | JetBrains Mono Bold | número 88 px, rótulos 26–30 px |
| Nota corrida em cartão | Inter Bold | 32 px |

Nada abaixo de 28 px (o `hyperframes check` avisa). Rótulo 3D: JetBrains Mono em plaquinha escura.

## Lugar de cada coisa (no quadro 1080 × 1920)
- **Aparelho:** topo esquerdo, x 64, y 190, 420 px de largura (abaixo da barra do celular). Roda o reel inteiro.
- **Título:** painel centralizado, topo em ~600 px, raio 26 px, chip amarelo "E SE…?".
- **Cartões com número:** x 64 a 1016; em cima (y 470) ou embaixo (`.baixo`, base a 640 px do pé). **Todo cartão tem a linha de fonte** (◆ FONTE: NASA…).
- **Legenda:** centro, topo em 1250 px. O quarto de baixo fica livre (botões do app).

## Legenda
- 1 a 3 palavras por vez (4 só para não deixar palavra sozinha), uma de cada vez, presa à palavra falada (tempo do Whisper).
- Entra 0,06 s antes da 1ª palavra, sai 0,2 s depois da última.
- Números falados viram algarismos na tela ("doze" → "12 h") pelo campo `tela` do `roteiro.json`.
- Palavra-chave em amarelo (campo `destaques` + todo número).

## Movimento
- Câmera: um empurrão ou afastamento lento por cena, curva suave (io). Corte seco entre lugares.
- O evento: o número do aparelho muda em ~1,2 s e o mundo troca de aparência ao mesmo tempo.
- Escala cresce a cada cena: você → uma cidade brasileira → um lugar extremo → o planeta → o espaço → a volta.
- Troca de conteúdo a cada 1,5–3 s (cartão, barra, rótulo, câmera ou legenda).

## Som
- Voz do Nei, gerada no computador (Chatterbox + Whisper, `ferramentas/voz.py`). A voz é o relógio: todo tempo visual sai dela.
- Música sintetizada em código (`ferramentas/mezcla.py --musica tranquila`), ~23 dB abaixo da voz; mistura final em −14 LUFS.
- Sem efeito sonoro no meio.

## Proibido
Brilho/bloom, lens flare, partículas decorativas, cartões de vidro, degradê roxo, três cartões lado a lado, planetas lado a lado em tamanho errado, "exatamente", logo de terceiro, segunda fonte de legenda, amarelo em qualquer coisa que não seja a principal, número sem fonte.

## Quadros para conferir
Quadro 0 (capa) · o instante da troca de aparência · um quadro no meio de cada cena · a volta · o último quadro (igual ao 0).
