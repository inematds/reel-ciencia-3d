---
name: reel-ciencia-3d
version: 1.1.1
description: Reel de ciência "E se…?" 9:16 feito só com código — mundo 3D em Three.js dentro do HyperFrames, fatos com fonte na tela, voz local do Nei presa à palavra, música em código, último quadro igual ao primeiro. Gatilho: "reel de ciência", "e se a Terra/Lua/Sol…", "faz um reel e se…", "vídeo de ciência em 3D sem IA de vídeo".
---

# reel-ciencia-3d

Você é o estúdio; quem pede é o diretor. O diretor decide 4 coisas: **a ferramenta, os fatos, a mensagem com o visual, e o julgamento do resultado**. Você faz o trabalho pesado: pesquisa, código, voz, render e conferência.

Nada neste reel é desenhado por IA de imagem ou de vídeo. Render, voz e música são grátis e rodam no computador.

## O processo, do início ao fim

| # | Passo | Quem | Comando / saída |
|---|---|---|---|
| 1 | Pergunta "E se…?" + a única resposta que o reel tem que provar | 🧠 diretor | uma linha cada |
| 2 | **Fatos primeiro**: `fatos.md` com fonte por número (NASA, NOAA, INPE, Marinha, universidade). Sem fonte = DEIXADO DE FORA | 🤖 Claude | `exemplos/<id>/fatos.md` |
| 3 | Roteiro: 8–10 batidas em escala crescente, 150–170 palavras, voz ativa | 🤖 Claude → 🧠 aprova | `roteiro.json` (blocos b0…bN, frases, `tela`, `destaques`) |
| 4 | Voz do Nei com o tempo de cada palavra | ⚙️ script | `python3 ferramentas/voz.py --projeto exemplos/<id> exemplos/<id>/roteiro.json` |
| 5 | Relógio do reel (legenda pronta, horas de cada frase e palavra) | ⚙️ script | `python3 ferramentas/montar.py --projeto exemplos/<id>` → `js/tempos.js` |
| 6 | Música em código + mistura | ⚙️ script | `python3 ferramentas/mezcla.py --projeto exemplos/<id> --id <id-do-roteiro> --musica tranquila` |
| 7 | Página (`index.html`: aparelho, título, cartões com fonte, legenda) + mundo 3D (`js/mundo.js`) | 🤖 Claude | ver "Como montar" abaixo |
| 8 | Preparar (copia o motor, duração, som final) | ⚙️ script | `python3 ferramentas/preparar.py --projeto exemplos/<id>` |
| 9 | Teste | ⚙️ | `npx hyperframes check` → 0 erros |
| 9b | **Tempo de leitura** de cada texto da tela (cartões, fontes, dados, chamada) | ⚙️ script | `node ferramentas/checar-leitura.mjs --project exemplos/<id> --step 0.1` → 0 (1 = algum texto some antes de ler: segure mais ou corte palavras; 2 = não verificou). Contador do aparelho = uma peça; data que muda → `data-leitura="contador"`; `#leg` fica de fora |
| 10 | **Uma imagem parada por cena antes de renderizar** | 🤖 tira, 🧠 julga | `npx hyperframes snapshot --at 0,<meio de cada bloco>,<fim> --no-end -o stills` |
| 11 | Julgar com 3 perguntas (`checklists/julgar-quadros.md`); corrigir **uma coisa por vez** | 🧠 + 🤖 | — |
| 12 | Render | ⚙️ | `npx hyperframes render --output renders/<id>.mp4` (~5 min para 65 s) |
| 13 | Julgar o MP4 de verdade (quadros do arquivo, não da prévia) + `checklists/antes-de-publicar.md` | 🤖 + 🧠 | `ffmpeg -i renders/<id>.mp4 -vf fps=1/4,scale=270:-1,tile=6x3 folha.jpg` |

## Como montar (passo 7)

Copie um exemplo pronto (`exemplos/terra-sem-inclinacao/`) e troque o conteúdo. Peças do motor (`motor/base.js`):

- `criarMundo()` → renderer, scene, camera (1080×1920, sombras, tone mapping).
- `mat(corReal, corEse)` + `solido(geo, mat)` → todo objeto tem as duas aparências; `aparencia(m)` mistura (0 = real, 1 = e se).
- `ceu(scene)` → céu em degradê com as duas aparências.
- `globo(R)` → Terra com **os continentes reais** (Natural Earth 1:110m, domínio público) nas duas aparências; `noGlobo(lat, lon, R)` põe pinos.
- `rotulo(texto, {cor, tam, largura})` → plaquinha 3D com texto.
- `legenda(t, LEG)` e `cartoes(t, F, B)` → tudo o que tem `data-de`/`data-ate` no HTML aparece e some no tempo da fala. `data-de="poa+1.4"` = 1,4 s depois do início da frase `poa`; `"poa.fim-0.3"`; `"b3"` (bloco). Barras: `data-larg="0>0.42@poa+1.5;0.42>0.5@poa2+0.6"`.
- `palavra('poa', 'dezembro')` (de `js/tempos.js`) → a hora exata em que a palavra é dita. Use para o aparelho e a câmera.
- `ligar(nome, renderAt)` → liga ao relógio do HyperFrames. **Tudo é função do tempo**: nada de `requestAnimationFrame`, nada de `Math.random()` sem semente (`rng(seed)`).

Regras de montagem: corte de cena = início do bloco − 0,12 s; o número do aparelho é o evento da história; o primeiro e o último quadro usam a mesma câmera; o título tem `data-de="0"` (aparece no quadro 0).

## Regras duras
- **Sem fonte, não entra** (nem na tela, nem na voz). Cálculo próprio é marcado como CÁLCULO; estimativa de cientista como ESTIMATIVA.
- Diga "cerca de" quando a fonte arredonda. Nunca aumente a afirmação da fonte.
- Voz sempre local (Chatterbox). Não use serviço pago de voz nem de vídeo.
- Visual: `STYLE.md`. Uma cor quente só. Texto ≥ 28 px.
- Uma mudança por vez: "Mova só X para Y. Mantenha o resto. Renderize de novo."

## Pegadinhas
- Ano e número na voz: escreva por extenso no roteiro e mapeie para algarismo no campo `tela` (o Whisper às vezes devolve "23,4" — inclua as duas formas).
- Em retrato (9:16) a largura visível é pequena: um globo de raio 3 com fov 36 precisa da câmera a ~17–20 unidades.
- Ninguém renderiza escuro sem querer: a aparência E SE usa luz própria (`emissive`) para não virar preto.
- `hyperframes snapshot` mostra a cena antes do render — sempre olhe antes de gastar 5 min de render.
