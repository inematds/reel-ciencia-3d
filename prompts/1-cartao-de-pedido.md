# 1 · Cartão de pedido (cole no Claude Code, numa pasta com este kit)

Troque o que está entre `<sinais>`. As 6 regras numeradas são as decisões que ficam com você: ferramenta, fatos, uma mensagem com um visual, e julgar o resultado antes do render.

```text
Use a skill reel-ciencia-3d. Faça um reel vertical de ~60 s: "<E se …?>". HyperFrames para o vídeo, Three.js só para o mundo 3D, o motor em motor/.
1. Fatos primeiro. Escreva exemplos/<id>/fatos.md: cada número com fonte (NASA, NOAA, INPE, Marinha, universidade) e uma citação curta. Sem fonte: DEIXADO DE FORA, não entra na tela nem na voz.
2. Uma pergunta, uma resposta: <a resposta em uma linha>. Batidas em escala crescente: <você> → <uma cidade brasileira> → <um lugar extremo> → <o planeta> → <o espaço> → <a volta>.
3. <Um aparelho: medidor, contador ou cronômetro> fica na tela o reel inteiro. O último quadro repete o primeiro.
4. Visual: STYLE.md. Amarelo só para <a coisa principal da história>. Cada cartão com número mostra a fonte.
5. Voz do Nei local (ferramentas/voz.py), legenda palavra a palavra, música em código.
6. Me mostre uma imagem parada por cena antes de renderizar. Depois renderize o MP4.
```

## Exemplo preenchido — "E se o dia durasse 48 horas?"

Só mostra como preencher. O Claude ainda precisa achar fonte para cada número (regra 1); se a resposta não se sustentar, troque a resposta, não os fatos.

```text
Use a skill reel-ciencia-3d. Faça um reel vertical de ~60 s: "E se o dia durasse 48 horas?". HyperFrames para o vídeo, Three.js só para o mundo 3D, o motor em motor/.
1. Fatos primeiro. Escreva exemplos/dia-48h/fatos.md: cada número com fonte (NASA, NOAA, INPE, universidade) e uma citação curta. Sem fonte: DEIXADO DE FORA.
2. Uma pergunta, uma resposta: noites e dias mais longos e mais extremos. Batidas: sua janela → São Paulo → o Saara → o planeta → a Lua → a volta.
3. Um relógio "HORAS DO DIA" fica na tela o reel inteiro. O último quadro repete o primeiro.
4. Visual: STYLE.md. Amarelo só para o Sol. Cada cartão com número mostra a fonte.
5. Voz do Nei local (ferramentas/voz.py), legenda palavra a palavra, música em código.
6. Me mostre uma imagem parada por cena antes de renderizar. Depois renderize o MP4.
```

Os três reels de `exemplos/` saíram deste cartão.
