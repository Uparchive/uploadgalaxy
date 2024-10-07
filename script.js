document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Firebase usando CDN
    const firebaseConfig = {
        apiKey: "AIzaSyAbADgKRicHlfDWoaXmIfU0EjGbU6nFkPQ",
        authDomain: "armazene-acd30.firebaseapp.com",
        databaseURL: "https://armazene-acd30-default-rtdb.firebaseio.com",
        projectId: "armazene-acd30",
        storageBucket: "armazene-acd30.appspot.com",
        messagingSenderId: "853849509051",
        appId: "1:853849509051:web:ea6f96915c4d5c895b2d9e",
        measurementId: "G-79TBH73QPT"
    };
    
    firebase.initializeApp(firebaseConfig);
    const storage = firebase.storage();

    const uploadForm = document.getElementById('upload-form');
    const fileListSection = document.getElementById('file-list');

    // Função para exibir a lista de arquivos enviados
    function displayFiles(files) {
        fileListSection.innerHTML = '';
        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;

            // Criar botão de download
            const downloadButton = document.createElement('a');
            downloadButton.textContent = 'Download';
            downloadButton.href = file.url;
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

        const file = files[0];
        const storageRef = storage.ref(`uploads/${file.name}`);

        try {
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            alert('Arquivo enviado com sucesso!');

            // Adiciona o arquivo à lista de arquivos enviados
            displayFiles([{ name: file.name, url: downloadURL }]);
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao fazer upload: ' + error.message);
        }

        // Limpar o campo de upload
        fileInput.value = '';
    });
});