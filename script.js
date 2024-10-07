document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileListSection = document.getElementById('file-list');
    const filePreviewSection = document.getElementById('file-preview');

    // Função para exibir a lista de arquivos enviados
    function displayFiles(files) {
        fileListSection.innerHTML = '';
        filePreviewSection.innerHTML = '';
        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;

            // Criar botão de download
            const downloadButton = document.createElement('a');
            downloadButton.textContent = 'Download';
            downloadButton.href = file.url; // URL real do arquivo no servidor
            downloadButton.classList.add('download-button');
            downloadButton.download = file.name;

            // Criar botão de compartilhar
            const shareButton = document.createElement('button');
            shareButton.textContent = 'Copiar Link';
            shareButton.classList.add('share-button');
            shareButton.addEventListener('click', () => {
                navigator.clipboard.writeText(file.url).then(() => {
                    alert('Link copiado para a área de transferência!');
                }).catch(() => {
                    alert('Falha ao copiar o link.');
                });
            });

            listItem.appendChild(downloadButton);
            listItem.appendChild(shareButton);
            fileListSection.appendChild(listItem);

            // Adicionar pré-visualização se for uma imagem ou vídeo
            const previewItem = document.createElement('div');
            previewItem.classList.add('file-preview-item');
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
                const img = document.createElement('img');
                img.src = file.url; // URL real do arquivo no servidor
                img.alt = file.name;
                previewItem.appendChild(img);
            } else if (file.name.match(/\.(mp4|webm|ogg)$/i)) {
                const video = document.createElement('video');
                video.src = file.url; // URL real do arquivo no servidor
                video.controls = true;
                previewItem.appendChild(video);
            }
            if (previewItem.hasChildNodes()) {
                filePreviewSection.appendChild(previewItem);
            }
        });
    }

    // Evento de envio do formulário
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('file-input');
        const files = fileInput.files;

        if (files.length === 0) {
            alert('Por favor, selecione um arquivo antes de fazer o upload.');
            return;
        }

        // Fazer upload do arquivo para o servidor
        const formData = new FormData();
        formData.append('file', files[0]);

        try {
            const response = await fetch('https://seu-servidor-publico.com/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erro ao fazer upload do arquivo: ${response.statusText}`);
            }

            const result = await response.json();
            if (result && result.fileUrl) {
                alert('Arquivo enviado com sucesso!');

                // Adiciona o nome do arquivo à lista de arquivos enviados
                displayFiles([{ name: files[0].name, url: result.fileUrl }]);
            } else {
                throw new Error('Resposta inesperada do servidor');
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao fazer upload: ' + error.message);
        }

        // Limpar o campo de upload
        fileInput.value = '';
    });
});