<!-- coderabbit-ai-generated:v1 -->

# NAJA 3D Map Construct — fundação

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:00e0739e2cb1909e27f47fcd4e3b317effe0a913137888bf62591f0f711dc90a -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d93d4f2e3cde24b30d538e57dc9ac39d228ee6df148a3366f6159d09160ebd61 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:779dd7739543712b94c2133bbe5d20d435b40a010bb3df39c9aa0f05e9103daf -->

Esta versão de desenvolvimento inclui biblioteca, edição de mapa, inspetor, projetos e exportação GLB. A validação completa da v1.0 ainda está pendente.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

## Executar

Requisitos: Node.js 24, npm e ambiente gráfico Linux.

```sh
npm ci
npm run dev
```

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:c908186b0d54fb29efff0db2b3ff2b8b67c5ba7d61d78afaef8315d9ca58bc01 -->

Use o seletor no topo para trocar o idioma e o botão ao lado para alternar o tema. Para executar apenas a interface no navegador, use `npm run dev:web`.

No viewport, use o botão direito para orbitar, botão do meio ou Espaço + arrastar para mover, roda para zoom e F para enquadrar a origem. WASD e o joystick movem a câmera. Os botões no canto inferior direito controlam o zoom e o enquadramento. <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:2e06e05b41a191af2072ed337af4aa8411e2af17c94eaa13347f6571282b0e34 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:dbdda3ee810affa5bebbf9c99123b8357fba5b0da9a109d0436739a05e87087b -->

Arraste um asset da biblioteca para o chão; clique para selecionar e Shift + clique para selecionar várias peças. Use W/E/R para mover/girar/escalar uma peça selecionada; Ctrl+D duplica, Delete exclui, Ctrl+Z desfaz e Ctrl+Shift+Z refaz. W move a câmera quando nenhuma peça está selecionada.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

No Electron, o seletor de renderização salva a escolha e reinicia o app. Automático permite fallback SwiftShader; CPU solicita SwiftShader; GPU solicita uso da GPU, mas depende dos drivers. O selo informa o renderizador detectado, ou desconhecido se a informação não estiver disponível. O Chromium considera o SwiftShader para WebGL uma opção de segurança reduzida; use apenas conteúdo confiável. Consulte [a documentação do Chromium](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md).

<!-- /coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:c158e7c338a67b810c7bc58666b1f31bb2957fbb4611bbdffe216f9ea45e2382 -->

## Biblioteca

Clique em Importar e escolha uma pasta, ou arraste uma pasta para a janela. Arquivos GLB e OBJ são encontrados em subpastas; use a árvore e a busca para filtrá-los. Os modelos e suas miniaturas ficam no armazenamento local do aplicativo (IndexedDB). Reimportar um caminho substitui a versão em cache. Erros por arquivo aparecem na biblioteca. OBJ usa material padrão sem carregar MTL; GLB requer recursos incorporados. Sem WebGL, o modelo pode ser importado sem miniatura.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:78258d819a11b80829fbc3afc15461ea8656c84fd8eee0a2e3ad8c5b91608439 -->

## Projetos e exportação

Salve o mapa em `.naja` e abra-o pelo botão Abrir. O projeto incorpora os assets e as texturas alteradas, além das transformações, materiais, colisões e configurações de snap; uma cópia dos projetos recentes fica no armazenamento local. Reimportar um arquivo com o mesmo nome substitui essa cópia recente. O navegador ou Electron escolhe o local de download.

No inspetor, edite posição, rotação, escala, dimensões, cor, emissão, metal, rugosidade e opacidade. Texturas podem ser aplicadas à peça ou às instâncias existentes do mesmo asset. O perfil Godot inclui nós de colisão por caixa, convexa ou malha; o perfil Neutro exporta apenas geometria visual. O arquivo GLB é gerado com texturas incorporadas.

## Limitações conhecidas

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7c377089a0ae868989776c71bedee2c03588040c0090307e79f59b02b2064ec9 -->

- No teste sintético com SwiftShader, <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:ab8afd34cc0721333d76cd1d11a469ebb4361c85a4a6d850d07c669984fbbce2 -->

200 cubos repetidos ficaram em torno de 39 FPS e 1.000 abriram em menos de um segundo, com cerca de 31 FPS

<!-- /coderabbit-ai-generated:v1 -->. O resultado depende do hardware e do modelo; o agrupamento usa instancing para peças opacas estáticas idênticas.

<!-- /coderabbit-ai-generated:v1 -->
- A validação de compatibilidade completa com Blender, Unity e as três distribuições alvo ainda não foi feita. A prévia em nuvem deste ambiente não disponibiliza WebGL.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:6fbef74608e3be531a4f3736ca3806a52e72360e3dbbf47cb28f299e89c55801 -->

- <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:40eed9a5c7fb833e6f93b94e82630770dd2f6564d8f0a23c10fffbf947135f09 -->

A seleção múltipla permite transformar, duplicar e excluir em grupo; a escala do grupo é proporcional para preservar as transformações das peças, e o inspetor edita uma peça por vez.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 --> <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:51751fc685800ad59a7849ca0100c1642bc177802cc487fa357d12cdaab734eb -->

Arraste os rótulos X/Y/Z para alterar valores; Shift reduz o passo e Alt aumenta.

<!-- /coderabbit-ai-generated:v1 -->
- O AppImage é experimental e ainda não é uma versão 1.0 validada.

## Validar

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

```sh
npm run lint
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:c48cef9f1bf4e17feb451cf233edf1273e80bfe0b8fe1a67a84109b8424982e4 -->

npm test
npm run test:e2e  # requer xvfb-run no Linux
npm run build

<!-- /coderabbit-ai-generated:v1 -->
```

O CI executa esses comandos. A configuração preliminar de AppImage pode ser acionada com `npm run dist`, mas não constitui a entrega final nem foi validada nas distribuições previstas no plano. Em sistemas sem FUSE 2, AppImages podem ser executados com `--appimage-extract-and-run`.

Licença GPL-3.0-only; consulte LICENSE e THIRD_PARTY_LICENSES.md.
