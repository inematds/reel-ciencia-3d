# Checklist — antes de publicar

- [ ] `npx hyperframes check` → 0 erros.
- [ ] `ffprobe renders/<id>.mp4` → 1080x1920, 30 fps, 55–75 s (Instagram Reels aceita até 3 min; TikTok paga criador só acima de 1 min).
- [ ] `ffmpeg -i renders/<id>.mp4 -af ebur128 -f null -` → cerca de −14 LUFS.
- [ ] Assistiu uma vez no celular com som e uma sem som (a legenda conta a história sozinha?).
- [ ] Último quadro = primeiro.
- [ ] Números da tela = voz = `fatos.md`.
- [ ] Descrição com as fontes principais e o link do kit.
- [ ] Cada vídeo ensina algo novo: o formato pode repetir, o assunto e a pesquisa não. Vídeo em série igual demais perde alcance e não é pago pelas plataformas.
