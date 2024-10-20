// Importações do Firebase Modular SDK (Certifique-se de usar a versão mais recente disponível)
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    signOut, // Importar signOut para funcionalidade de logout
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
const logoutButton = document.getElementById('logout-button'); // Botão de Logout
const heroSection = document.getElementById('hero-section');

// Variáveis Globais
const totalAvailableGB = 'Ilimitado'; // Espaço total disponível em GB
let allFiles = [];
let isUploading = false;

// Monitorar o estado de autenticação do usuário
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário autenticado
        loginSection.style.display = 'none';
        uploadSection.style.display = 'block';
        fileListSection.style.display = 'block';
        logoutButton.style.display = 'block';
        heroSection.style.display = 'none'; // Ocultar a seção "Hero" após o login
        fetchAllFiles();
    } else {
        // Usuário não autenticado
        loginSection.style.display = 'block';
        uploadSection.style.display = 'none';
        fileListSection.style.display = 'none';
        fileList.innerHTML = '';
        storageUsageDisplay.textContent = '0.00 GB de Ilimitado';
        logoutButton.style.display = 'none';
        heroSection.style.display = 'block'; // Exibir a seção "Hero" se não estiver logado
    }
});

// Função para login com Google
googleLoginButton.addEventListener('click', () => {
    console.log('Botão de login clicado');
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log('Usuário logado via popup:', result.user);
            alert('Login realizado com sucesso!');
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

// Função para exibir mensagens personalizadas
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('message-container');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.innerHTML = `
        <span>${message}</span>
        <i class="fas fa-times" onclick="this.parentElement.remove()"></i>
    `;
    
    messageContainer.appendChild(messageElement);

    // Remover mensagem após alguns segundos
    setTimeout(() => {
        if (messageElement.parentElement) {
            messageElement.remove();
        }
    }, 5000);
}

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

    // Definindo o caminho de upload para o diretório do usuário
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
                console.log('Tentando obter a URL de download para:', uploadTask.snapshot.ref.fullPath);

                // Tentativa de obter a URL do download
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                // Verifique a estrutura completa da URL
                console.log('URL de download obtida com sucesso:', downloadURL);

                alert('Arquivo enviado com sucesso!');

                // Atualiza a lista de arquivos exibidos
                await fetchAllFiles();

                // Limpar o campo de upload e progresso
                fileInput.value = '';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
                progressContainer.style.display = 'none';
                isUploading = false;
            } catch (error) {
                console.error('Erro ao obter URL de download:', error);
                console.error('Código do erro:', error.code);
                console.error('Mensagem do erro:', error.message);
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
    const user = auth.currentUser;
    if (user) {
        try {
            console.log('Usuário autenticado:', user.uid);
            const storageRef = ref(storage, `uploads/${user.uid}/`);
            console.log('Buscando arquivos no caminho:', storageRef.fullPath);
            const filesSnapshot = await listAll(storageRef);
            console.log('Arquivos encontrados:', filesSnapshot.items.length);

            const allFilesFetched = await Promise.all(
                filesSnapshot.items.map(async (item) => {
                    try {
                        const url = await getDownloadURL(item);
                        const metadata = await getMetadata(item);
                        return {
                            name: item.name,
                            url,
                            timeCreated: metadata.timeCreated,
                            size: Number(metadata.size) // Garantir que seja um número
                        };
                    } catch (error) {
                        console.error('Erro ao obter URL ou metadados do arquivo:', item.name, error);
                        return null;
                    }
                })
            );

            allFiles = allFilesFetched.filter(file => file !== null);
            console.log('Arquivos válidos para exibição:', allFiles);

            if (allFiles.length > 0) {
                sortFiles(sortSelect.value);
                updateStorageUsage();
            } else {
                console.log('Nenhum arquivo válido encontrado.');
                fileList.innerHTML = ''; // Limpa a lista se não houver arquivos válidos
                updateStorageUsage(); // Atualiza o uso de armazenamento mesmo que não haja arquivos válidos
            }
        } catch (error) {
            console.error('Erro ao listar arquivos:', error);
        }
    } else {
        console.log('Usuário não autenticado.');
    }
}

// Função para ordenar os arquivos
sortSelect.addEventListener('change', () => {
    sortFiles(sortSelect.value);
});

function displayFiles(files) {
    fileList.innerHTML = '';
    files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span>${file.name} (${formatBytes(file.size)})</span>
            <div>
                <a href="${file.url}" class="download-button" download="${file.name}">Download</a>
                <button class="share-button" onclick="copyToClipboard('${file.url}')">Copiar Link</button>
                <button class="watch-button" onclick="playVideo('${file.url}')">Assistir</button>
                <button class="delete-button" onclick="deleteFile('${file.name}')">Excluir</button>
            </div>
        `;
        fileList.appendChild(listItem);
    });
}

// Função para abrir o vídeo no player
function playVideo(url) {
    const videoPlayer = document.querySelector('#player');
    const source = videoPlayer.querySelector('source');
    source.src = url;
    videoPlayer.style.display = 'block';  // Exibe o player
    videoPlayer.load();                   // Carrega o novo vídeo
    videoPlayer.play();                   // Reproduz o vídeo automaticamente
    window.scrollTo(0, videoPlayer.offsetTop); // Rola a página até o player
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
        default:
            break;
    }

    displayFiles(sortedFiles);
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

        // Adiciona a confirmação de exclusão
        const confirmDelete = confirm(`Tem certeza de que deseja excluir o arquivo "${fileName}"?`);
        if (!confirmDelete) {
            console.log('Exclusão cancelada pelo usuário.');
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
    const totalUsedBytes = allFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const totalUsedGB = totalUsedBytes / (1024 ** 3);
    const formattedUsedGB = totalUsedGB.toFixed(2);
    const formattedTotalGB = totalAvailableGB;
    storageUsageDisplay.textContent = `${formattedUsedGB} GB de ${formattedTotalGB}`;
    
    // Opcional: Adicionar logs para depuração
    console.log(`Total Usado: ${formattedUsedGB} GB de ${formattedTotalGB}`);
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

// Função para copiar URL para a área de transferência
function copyToClipboard(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copiado para a área de transferência!');
    }).catch((error) => {
        console.error('Erro ao copiar link:', error);
        alert('Erro ao copiar link. Tente novamente.');
    });
}

// Anexar funções ao objeto window para torná-las acessíveis globalmente
window.copyToClipboard = copyToClipboard;
window.deleteFile = deleteFile;

// Função para logout (Desconectar o usuário)
async function logout() {
    try {
        await signOut(auth);
        console.log('Usuário desconectado com sucesso.');
        alert('Você foi desconectado com sucesso.');
    } catch (error) {
        console.error('Erro ao desconectar:', error);
        alert(`Erro ao desconectar: ${error.code} - ${error.message}`);
    }
}

// Adicionar evento de clique ao botão de logout
logoutButton.addEventListener('click', () => {
    logout();
});

// Função para impedir o usuário de sair durante o upload
window.addEventListener('beforeunload', function (e) {
    if (isUploading) {
        e.preventDefault();
        // A maioria dos navegadores ignora a string retornada, mas é necessária para alguns
        e.returnValue = '';
    }
});

// Exibir/ocultar o botão de voltar ao topo com base no scroll
const backToTopButton = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 200) { // Se o scroll for maior que 200px, exibe o botão
        backToTopButton.style.display = 'block';
    } else {
        backToTopButton.style.display = 'none';
    }
});
