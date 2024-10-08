// Importações do Firebase Modular SDK (Certifique-se de usar a versão mais recente disponível)
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    listAll, 
    deleteObject, 
    getMetadata 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

// Habilitar logs detalhados do Firebase para depuração
setLogLevel('debug');

// Configuração do Firebase (Substitua pelas suas próprias credenciais)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_AUTH_DOMAIN_HERE",
    projectId: "YOUR_PROJECT_ID_HERE",
    storageBucket: "YOUR_STORAGE_BUCKET_HERE",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
    appId: "YOUR_APP_ID_HERE",
    measurementId: "YOUR_MEASUREMENT_ID_HERE"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Elementos do DOM
const loginSection = document.getElementById('login-section');
const uploadSection = document.getElementById('upload-section');
const fileListSection = document.getElementById('file-list-section');
const googleLoginButton = document.getElementById('google-login-button');
const uploadForm = document.getElementById('upload-form');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const fileList = document.getElementById('file-list');
const storageUsageDisplay = document.getElementById('storage-usage');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');

// Variáveis Globais
const totalAvailableGB = 5; // Espaço total disponível em GB
let allFiles = [];
let isUploading = false;

// Monitorar o estado de autenticação do usuário
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Usuário logado:', user);
        loginSection.style.display = 'none';
        uploadSection.style.display = 'block';
        fileListSection.style.display = 'block';
        fetchAllFiles();
    } else {
        console.log('Usuário deslogado');
        loginSection.style.display = 'block';
        uploadSection.style.display = 'none';
        fileListSection.style.display = 'none';
        fileList.innerHTML = '';
        storageUsageDisplay.textContent = '0.00 GB de 5.00 GB';
    }
});

// Função para login com Google
googleLoginButton.addEventListener('click', () => {
    console.log('Botão de login clicado');
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log('Usuário logado via popup:', result.user);
        })
        .catch((error) => {
            console.error('Erro ao fazer login:', error);
            alert(`Erro ao fazer login: ${error.code} - ${error.message}`);
        });
});

// Evento para o formulário de upload
uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isUploading) {
        console.log('Iniciando upload...');
        startUpload();
    }
});

// Função para iniciar o upload
async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const user = auth.currentUser;

    if (!user) {
        console.log('Usuário não autenticado');
        alert('Você precisa estar logado para fazer o upload de arquivos.');
        return;
    }

    if (!file) {
        console.log('Nenhum arquivo selecionado');
        alert('Por favor, selecione um arquivo antes de fazer o upload.');
        return;
    }

    const storageRefPath = `uploads/${user.uid}/${file.name}`;
    const storageRefObj = ref(storage, storageRefPath);
    const uploadTask = uploadBytesResumable(storageRefObj, file);

    // Mostrar o container de progresso
    progressContainer.style.display = 'block';
    isUploading = true;

    console.log(`Iniciando upload para: ${storageRefPath}`);

    // Monitorar o progresso do upload
    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress.toFixed(2)}%`;
            console.log(`Upload em progresso: ${progress.toFixed(2)}%`);
        },
        (error) => {
            console.error('Erro ao fazer upload:', error);
            alert(`Erro ao fazer upload: ${error.code} - ${error.message}`);
            isUploading = false;
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        },
        async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                console.log('Upload concluído com sucesso. URL:', downloadURL);
                alert('Arquivo enviado com sucesso!');
                await fetchAllFiles();
                fileInput.value = '';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
                progressContainer.style.display = 'none';
                isUploading = false;
            } catch (error) {
                console.error('Erro ao obter URL de download:', error);
                alert(`Erro ao obter URL de download: ${error.code} - ${error.message}`);
                isUploading = false;
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
            }
        }
    );
}

// Função para buscar todos os arquivos do usuário
async function fetchAllFiles() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Usuário não autenticado para buscar arquivos');
            return;
        }

        console.log('Buscando arquivos para o usuário:', user.uid);

        const storageRef = ref(storage, `uploads/${user.uid}`);
        const filesSnapshot = await listAll(storageRef);

        if (filesSnapshot.items.length === 0) {
            console.log('Nenhum arquivo encontrado no diretório');
            fileList.innerHTML = '<li>Nenhum arquivo encontrado</li>';
            updateStorageUsage();
            return;
        }

        allFiles = await Promise.all(
            filesSnapshot.items.map(async (item) => {
                try {
                    const url = await getDownloadURL(item);
                    const metadata = await getMetadata(item);
                    return {
                        name: item.name,
                        url,
                        timeCreated: metadata.timeCreated,
                        size: metadata.size
                    };
                } catch (error) {
                    console.error('Erro ao obter informações do arquivo:', error);
                    return null;
                }
            })
        );

        allFiles = allFiles.filter(file => file !== null);
        sortFiles(sortSelect.value);
        updateStorageUsage();

    } catch (error) {
        console.error('Erro ao carregar os arquivos:', error);
        alert(`Erro ao carregar os arquivos: ${error.code} - ${error.message}`);
    }
}

// Função para ordenar os arquivos
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
        default:
            break;
    }

    displayFiles(sortedFiles);
}

// Função para exibir os arquivos na lista
function displayFiles(files) {
    fileList.innerHTML = '';

    files.forEach(file => {
        const listItem = document.createElement('li');

        const fileNameSpan = document.createElement('span');
        const fileSize = formatBytes(file.size);
        fileNameSpan.textContent = `${file.name} (${fileSize})`;
        listItem.appendChild(fileNameSpan);

        const buttonContainer = document.createElement('div');

        const downloadButton = document.createElement('a');
        downloadButton.textContent = 'Download';
        downloadButton.href = file.url;
        downloadButton.classList.add('download-button');
        downloadButton.download = file.name;
        buttonContainer.appendChild(downloadButton);

        const shareButton = document.createElement('button');
        shareButton.textContent = 'Copiar Link';
        shareButton.classList.add('share-button');
        shareButton.addEventListener('click', () => {
            navigator.clipboard.writeText(file.url)
                .then(() => {
                    alert('Link copiado para a área de transferência!');
                })
                .catch(() => {
                    alert('Falha ao copiar o link.');
                });
        });
        buttonContainer.appendChild(shareButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            const confirmDelete = confirm(`Tem certeza que deseja excluir o arquivo "${file.name}"?`);
            if (confirmDelete) {
                deleteFile(file.name);
            }
        });
        buttonContainer.appendChild(deleteButton);

        listItem.appendChild(buttonContainer);
        fileList.appendChild(listItem);
    });
}

// Função para excluir um arquivo
async function deleteFile(fileName) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('Usuário não autenticado para excluir arquivos');
            alert('Você precisa estar logado para excluir arquivos.');
            return;
        }

        const fileRef = ref(storage, `uploads/${user.uid}/${fileName}`);
        await deleteObject(fileRef);
        console.log(`Arquivo "${fileName}" excluído com sucesso.`);
        alert('Arquivo excluído com sucesso!');
        fetchAllFiles();
    } catch (error) {
        console.error('Erro ao excluir o arquivo:', error);
        alert(`Erro ao excluir o arquivo: ${error.code} - ${error.message}`);
    }
}

// Função para atualizar o uso de armazenamento
function updateStorageUsage() {
    const totalUsedBytes = allFiles.reduce((sum, file) => sum + file.size, 0);
    const totalUsedGB = totalUsedBytes / (1024 ** 3);
    const formattedUsedGB = totalUsedGB.toFixed(2);
    const formattedTotalGB = totalAvailableGB.toFixed(2);
    storageUsageDisplay.textContent = `${formattedUsedGB} GB de ${formattedTotalGB} GB`;
}

// Função para formatar bytes em unidades legíveis
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Função para buscar e exibir arquivos com base na busca
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filteredFiles = allFiles.filter(file => file.name.toLowerCase().includes(query));
    displayFiles(filteredFiles);
});
