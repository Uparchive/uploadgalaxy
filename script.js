import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase
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

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Estado de autenticação do usuário
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Usuário logado:', user);
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('upload-section').style.display = 'block';
            document.getElementById('file-list-section').style.display = 'block';
            fetchAllFiles();
        } else {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('file-list-section').style.display = 'none';
        }
    });

    // Login com Google
    document.getElementById('google-login-button').addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then((result) => {
                console.log('Usuário logado:', result.user);
            })
            .catch((error) => {
                console.error('Erro ao fazer login:', error);
            });
    });

    // Inicializar a aplicação
    initApp();
});

// Função para inicializar a aplicação
function initApp() {
    const uploadForm = document.getElementById('upload-form');
    const fileListSection = document.getElementById('file-list');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    const searchInput = document.getElementById('search-input');
    const storageUsageDisplay = document.getElementById('storage-usage');
    const sortSelect = document.getElementById('sort-select');

    const totalAvailableGB = 5; // Defina aqui o total de espaço disponível em GB
    let allFiles = [];
    let isUploading = false;

    // Evento para o formulário de upload
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isUploading) {
            startUpload();
        }
    });

    async function startUpload() {
        const fileInput = document.getElementById('file-input');
        const files = fileInput.files;

        if (files.length === 0) {
            alert('Por favor, selecione um arquivo antes de fazer o upload.');
            return;
        }

        const file = files[0];
        const user = auth.currentUser;
        if (!user) {
            alert('Você precisa estar logado para fazer o upload de arquivos.');
            return;
        }

        try {
            const storageRef = ref(storage, `uploads/${user.uid}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

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
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    alert('Arquivo enviado com sucesso!');

                    // Recarrega a lista de arquivos para incluir o novo
                    await fetchAllFiles();

                    // Limpar o campo de upload e progresso
                    fileInput.value = '';
                    progressBar.style.width = '0%';
                    progressText.textContent = '0%';
                    isUploading = false;
                }
            );
        } catch (error) {
            console.error('Erro inesperado ao fazer upload:', error);
            alert('Erro inesperado ao fazer upload: ' + error.message);
            isUploading = false;
        }
    }

    async function fetchAllFiles() {
        try {
            const user = auth.currentUser;
            if (!user) {
                return;
            }
            const storageRef = ref(storage, `uploads/${user.uid}`);
            const filesSnapshot = await listAll(storageRef);
            allFiles = await Promise.all(
                filesSnapshot.items.map(async (item) => {
                    const url = await getDownloadURL(item);
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

    function displayFiles(files) {
        fileListSection.innerHTML = '';
        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.style.display = 'flex';
            listItem.style.flexDirection = 'row';
            listItem.style.justifyContent = 'space-between';
            listItem.style.alignItems = 'center';
            listItem.style.flexWrap = 'wrap';

            const fileNameSpan = document.createElement('span');
            const fileSize = formatBytes(file.size);
            fileNameSpan.textContent = `${file.name} (${fileSize})`;

            listItem.appendChild(fileNameSpan);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '0.5rem';

            const downloadButton = document.createElement('a');
            downloadButton.textContent = 'Download';
            downloadButton.href = file.url;
            downloadButton.classList.add('download-button');
            downloadButton.download = file.name;

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

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Excluir';
            deleteButton.classList.add('delete-button');
            deleteButton.addEventListener('click', () => {
                const confirmDelete = confirm(`Tem certeza que deseja excluir o arquivo "${file.name}"?`);
                if (confirmDelete) {
                    deleteFile(file.name);
                }
            });

            buttonContainer.appendChild(downloadButton);
            buttonContainer.appendChild(shareButton);
            buttonContainer.appendChild(deleteButton);

            listItem.appendChild(buttonContainer);
            fileListSection.appendChild(listItem);
        });
    }

    async function deleteFile(fileName) {
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('Você precisa estar logado para excluir arquivos.');
                return;
            }
            const fileRef = ref(storage, `uploads/${user.uid}/${fileName}`);
            await deleteObject(fileRef);
            alert('Arquivo excluído com sucesso!');
            fetchAllFiles();
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

    fetchAllFiles();
}