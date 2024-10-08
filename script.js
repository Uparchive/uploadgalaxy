document.addEventListener('DOMContentLoaded', () => {
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
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    const searchInput = document.getElementById('search-input');
    const storageUsageDisplay = document.getElementById('storage-usage');
    const sortSelect = document.getElementById('sort-select');
    const passwordForm = document.getElementById('password-form');
    const passwordOverlay = document.getElementById('password-overlay');
    const errorMessage = document.getElementById('error-message');

    const totalAvailableGB = 5; // Defina aqui o total de espaço disponível em GB
    let allFiles = [];
    let isUploading = false;

    // Limpar o sessionStorage durante o desenvolvimento (remover em produção)
    sessionStorage.clear();

    // Verificar se o usuário está autenticado na sessão
    const isAuthenticated = sessionStorage.getItem('authenticated');
    if (isAuthenticated === 'true') {
        passwordOverlay.style.display = 'none';
        fetchAllFiles(); // Carregar a lista de arquivos se autenticado
    } else {
        passwordOverlay.style.display = 'flex';
    }

    // Evento para o formulário de senha
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        checkPassword();
    });

    // Evento para o formulário de upload
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isUploading) {
            startUpload();
        }
    });

    // Bloquear atualização da página durante o upload
    window.addEventListener('beforeunload', (e) => {
        if (isUploading) {
            e.preventDefault();
            e.returnValue = 'Há um upload em andamento. Tem certeza de que deseja sair?';
        }
    });

    searchInput.addEventListener('input', () => {
        filterFiles(searchInput.value);
    });

    function checkPassword() {
        const input = document.getElementById('password-input').value;
        if (input === 'KJJ') {
            passwordOverlay.style.display = 'none';
            sessionStorage.setItem('authenticated', 'true');
            fetchAllFiles(); // Carregar a lista de arquivos após a autenticação
        } else {
            errorMessage.style.display = 'block';
        }
    }

    async function startUpload() {
        const fileInput = document.getElementById('file-input');
        const files = fileInput.files;

        if (files.length === 0) {
            alert('Por favor, selecione um arquivo antes de fazer o upload.');
            return;
        }

        const file = files[0];
        const storageRef = storage.ref(`uploads/${file.name}`);
        const uploadTask = storageRef.put(file);

        // Mostrar o container de progresso
        progressContainer.style.display = 'block';
        isUploading = true;

        // Monitorar o progresso do upload
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress.toFixed(2)}%`;
            },
            (error) => {
                console.error('Erro ao fazer upload:', error);
                alert('Erro ao fazer upload: ' + error.message);
                isUploading = false;
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                alert('Arquivo enviado com sucesso!');

                // Recarrega a lista de arquivos para incluir o novo
                fetchAllFiles();

                // Limpar o campo de upload e progresso
                fileInput.value = '';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
                isUploading = false;
            }
        );
    }

    async function fetchAllFiles() {
        try {
            const storageRef = storage.ref('uploads');
            const filesSnapshot = await storageRef.listAll();
            allFiles = await Promise.all(
                filesSnapshot.items.map(async (item) => {
                    const url = await item.getDownloadURL();
                    const metadata = await item.getMetadata();
                    return {
                        name: item.name,
                        url,
                        timeCreated: metadata.timeCreated,
                        size: metadata.size
                    };
                })
            );

            sortFiles(sortSelect.value);
            updateStorageUsage();
        } catch (error) {
            console.error('Erro ao carregar os arquivos:', error);
        }
    }

    sortSelect.addEventListener('change', () => {
        sortFiles(sortSelect.value);
    });

    function sortFiles(criteria) {
        const sortedFiles = [...allFiles];

        switch (criteria) {
            case 'alphabetical':
                sortedFiles.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'alphabetical-desc':
                sortedFiles.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'newest':
                sortedFiles.sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated));
                break;
            case 'oldest':
                sortedFiles.sort((a, b) => new Date(a.timeCreated) - new Date(b.timeCreated));
                break;
            case 'size-asc':
                sortedFiles.sort((a, b) => a.size - b.size);
                break;
            case 'size-desc':
                sortedFiles.sort((a, b) => b.size - a.size);
                break;
        }

        displayFiles(sortedFiles);
    }

    function filterFiles(query) {
        const filteredFiles = allFiles.filter(file => file.name.toLowerCase().includes(query.toLowerCase()));
        displayFiles(filteredFiles);
    }

    function displayFiles(files) {
        fileListSection.innerHTML = '';
        files.forEach(file => {
            const listItem = document.createElement('li');

            // Criar um elemento para exibir o nome do arquivo e seu tamanho
            const fileNameSpan = document.createElement('span');
            const fileSize = formatBytes(file.size);
            fileNameSpan.textContent = `${file.name} (${fileSize})`;

            listItem.setAttribute('data-size', file.size);
            listItem.setAttribute('data-time-created', file.timeCreated);

            // Container para os botões
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '0.5rem';

            // Botão de Download
            const downloadButton = document.createElement('a');
            downloadButton.textContent = 'Download';
            downloadButton.href = file.url;
            downloadButton.classList.add('download-button');
            downloadButton.download = file.name;

            // Botão de Copiar Link
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

            // Botão de Excluir
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-button');
            deleteButton.addEventListener('click', () => {
                const confirmDelete = confirm(`Tem certeza que deseja excluir o arquivo "${file.name}"?`);
                if (confirmDelete) {
                    deleteFile(file.name);
                }
            });

            // Adicionar os botões ao container
            buttonContainer.appendChild(downloadButton);
            buttonContainer.appendChild(shareButton);
            buttonContainer.appendChild(deleteButton);

            // Adicionar o nome e os botões ao item da lista
            listItem.appendChild(fileNameSpan);
            listItem.appendChild(buttonContainer);
            fileListSection.appendChild(listItem);
        });
    }

    async function deleteFile(fileName) {
        try {
            const fileRef = storage.ref(`uploads/${fileName}`);
            await fileRef.delete();
            alert('Arquivo excluído com sucesso!');
            fetchAllFiles(); // Atualiza a lista de arquivos após a exclusão
        } catch (error) {
            console.error('Erro ao excluir o arquivo:', error);
            alert('Erro ao excluir o arquivo: ' + error.message);
        }
    }

    function updateStorageUsage() {
        const totalUsedBytes = allFiles.reduce((sum, file) => sum + file.size, 0);
        const totalUsedGB = totalUsedBytes / (1024 ** 3);
        const formattedUsedGB = totalUsedGB.toFixed(2);
        const formattedTotalGB = totalAvailableGB.toFixed(2);
        storageUsageDisplay.textContent = `${formattedUsedGB} GB de ${formattedTotalGB} GB`;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});