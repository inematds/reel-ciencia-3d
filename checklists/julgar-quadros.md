# Checklist — julgar os quadros (3 perguntas)

Conferir uma imagem leva segundos; consertar uma animação pronta leva muito mais. Julgue antes do render e de novo no MP4.

```bash
npx hyperframes snapshot --at 0,<meio de cada bloco>,<último segundo> --no-end -o stills   # antes do render
ffmpeg -i renders/<id>.mp4 -vf fps=1/3,scale=216:-1,tile=8x3 renders/folha.jpg            # depois do render
```

## 1. Dá para ler tudo no celular?
- [ ] Nenhum texto abaixo de 28 px (o `hyperframes check` avisa).
- [ ] Legenda não fica em cima de cartão nem de rótulo 3D.
- [ ] Nada cortado na borda (rótulo, globo, número).
- [ ] Nada importante no quarto de baixo (botões do app).

## 2. A escala é honesta?
- [ ] Planetas lado a lado só com tamanho certo — senão, um de cada vez.
- [ ] Barra de horas proporcional a 24 h; gráfico começa no zero.
- [ ] Mapa e globo com os continentes reais.

## 3. Há uma coisa clara para olhar?
- [ ] Um assunto por quadro; o amarelo só na coisa principal.
- [ ] Cena não está escura demais (a aparência E SE tem luz própria).
- [ ] Objeto reconhecível (não "caixa sem forma").

## Também
- [ ] Quadro 0 = capa com o título.
- [ ] Último quadro = quadro 0 (o reel volta ao começo).
- [ ] Liste o que falha com o segundo; corrija **uma coisa por vez**.
