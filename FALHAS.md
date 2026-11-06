# FALHAS — reel-ciencia-3d

| data | o que quebrou | menor correção | prompt \| infra |
|---|---|---|---|
| 06/11/2026 | título sumia no quadro 0 e no fim (`data-ate="99999"` lido como nome de frase) | `quando()` trata número puro como tempo; `data-de="0"` começa visível | prompt |
| 06/11/2026 | aparência E SE quase preta | `emissive` = cor E SE × 0,55 | prompt |
