<!-- coderabbit-ai-generated:v1 -->

# Decisões

- A primeira entrega segue a pausa após a fase 1 descrita no plano. Controles de funcionalidades futuras estão desativados e identificados.
- O idioma inicial segue o idioma do navegador/sistema: português usa pt-BR; outros usam inglês.
- O tema começa escuro; alterações de tema e idioma valem durante a sessão.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:a91c74ae878d0e9b0494b5f060b5732b1ca4f08ff8b961a78564bd90a1c5b46e -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:56b440610c24ee4563bbcff2ed6371b45f7890520ae57952ba8f18ad1cd467e3 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:cefdedd19d66009d59e3e075c4832d31d650ea2ebd9559af311e11224504aebc -->

- O viewport usa Three.js. Enquadrar utiliza a seleção, ou todas as peças quando não há seleção.
- W ativa mover quando uma peça está selecionada e move a câmera quando não há seleção, para conciliar os atalhos solicitados.

<!-- /coderabbit-ai-generated:v1 -->
- A biblioteca armazena arquivos e miniaturas em IndexedDB; o caminho relativo identifica cada peça e reimportá-lo substitui a versão anterior. OBJ usa material padrão e GLB requer recursos incorporados.

<!-- /coderabbit-ai-generated:v1 -->
- Os modos de renderização exigem reinício do Electron; GPU é uma solicitação, não uma garantia.

<!-- /coderabbit-ai-generated:v1 -->
