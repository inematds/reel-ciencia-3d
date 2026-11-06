#!/usr/bin/env bash
# Instala o reel-ciencia-3d como skill do Claude Code (e do Codex) e testa o render.
# Uso: bash instalar.sh
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
for d in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
  mkdir -p "$d"
  if [ -e "$d/reel-ciencia-3d" ] && [ ! -L "$d/reel-ciencia-3d" ]; then echo "  · $d/reel-ciencia-3d já existe (não mexi)"; continue; fi
  ln -sfn "$AQUI" "$d/reel-ciencia-3d" && echo "  ✓ skill em $d/reel-ciencia-3d"
done
command -v node >/dev/null || { echo "Falta Node.js 22+ (https://nodejs.org)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Falta ffmpeg"; exit 1; }
python3 -c "import numpy" 2>/dev/null || { echo "Falta numpy (música em código): python3 -m pip install numpy"; exit 1; }
echo "Testando o HyperFrames (baixa sozinho na 1ª vez)…"
( cd "$AQUI/exemplos/terra-sem-inclinacao" && npx --yes hyperframes check | tail -3 )
echo
echo "Voz local (opcional): inemavox com Chatterbox + Whisper. Sua voz: VC_VOZ=/caminho/sua-voz.wav"
echo "Teste: no Claude Code, cole o cartão de prompts/1-cartao-de-pedido.md com a sua pergunta."
