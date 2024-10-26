// Importações do Firebase Modular SDK
import { initializeApp, setLogLevel } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    listAll,
    deleteObject,
    getMetadata
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';

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
const fileList = document.getElementById('file-list');
const storageUsageDisplay = document.getElementById('storage-usage');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const logoutButton = document.getElementById('logout-button');
const heroSection = document.getElementById('hero-section');
const videoPlayerSection = document.getElementById('video-player-section');
const backToTopButton = document.getElementById('back-to-top');

// Variáveis Globais
const totalAvailableGB = 'Ilimitado';
let allFiles = [];
let isUploading = false;
let uploadTasks = []; // Armazena os uploads em andamento
let videoPlayer; // Inicializamos a variável sem atribuir um player ainda

// Monitorar o estado de autenticação do usuário
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário autenticado
        loginSection.style.display = 'none';
        uploadSection.style.display = 'block';
        fileListSection.style.display = 'block';
        logoutButton.style.display = 'block';
        heroSection.style.display = 'none';
        fetchAllFiles();
    } else {
        // Usuário não autenticado
        loginSection.style.display = 'block';
        uploadSection.style.display = 'none';
        fileListSection.style.display = 'none';
        fileList.innerHTML = '';
        storageUsageDisplay.textContent = '0.00 GB de Ilimitado';
        logoutButton.style.display = 'none';
        heroSection.style.display = 'block';

        // Certifique-se de que o player seja destruído quando o usuário sair
        if (videoPlayer) {
            videoPlayer.dispose();
            videoPlayer = null;
        }
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

// Função para iniciar o upload múltiplo
async function startUpload() {
    const fileInput = document.getElementById('file-input');
    const files = fileInput.files;
    const user = auth.currentUser;

    if (!user) {
        console.log('Usuário não autenticado');
        alert('Você precisa estar logado para fazer o upload de arquivos.');
        return;
    }

    if (!files.length) {
        console.log('Nenhum arquivo selecionado');
        alert('Por favor, selecione pelo menos um arquivo antes de fazer o upload.');
        return;
    }

    // Mostrar o container de progresso
    progressContainer.style.display = 'block';
    progressContainer.innerHTML = ''; // Limpar conteúdos anteriores
    isUploading = true;
    uploadTasks = [];

    console.log(`Iniciando upload de ${files.length} arquivos...`);

    // Iterar sobre cada arquivo e iniciar o upload
    Array.from(files).forEach((file, index) => {
        const timestamp = Date.now();
        const storageRefPath = `uploads/${user.uid}/${timestamp}_${file.name}`;
        const storageRefObj = ref(storage, storageRefPath);
        const uploadTask = uploadBytesResumable(storageRefObj, file);

        // Gerar IDs únicos para evitar conflitos
        const safeFileName = `file_${timestamp}_${index}`;

        // Criar elementos de progresso no DOM
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <span>${file.name} (${formatBytes(file.size)})</span>
            <div class="progress-bar-wrapper">
                <div class="progress-bar" id="progress-bar-${safeFileName}"></div>
                <span class="progress-text" id="progress-text-${safeFileName}">0%</span>
            </div>
        `;
        progressContainer.appendChild(progressItem);

        // Monitorar o progresso do upload
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const progressBar = document.getElementById(`progress-bar-${safeFileName}`);
                const progressText = document.getElementById(`progress-text-${safeFileName}`);
                if (progressBar && progressText) {
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `${progress.toFixed(2)}%`;
                }
                console.log(`Upload do arquivo ${file.name} em progresso: ${progress.toFixed(2)}%`);
            },
            (error) => {
                console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
                alert(`Erro ao fazer upload do arquivo ${file.name}: ${error.code} - ${error.message}`);
            },
            () => {
                // Upload concluído
                getDownloadURL(uploadTask.snapshot.ref)
                    .then((downloadURL) => {
                        console.log(`Upload do arquivo ${file.name} concluído. URL: ${downloadURL}`);
                    })
                    .catch((error) => {
                        console.error(`Erro ao obter a URL de download para o arquivo ${file.name}:`, error);
                    });
            }
        );

        // Armazenar a tarefa de upload
        uploadTasks.push(uploadTask);
    });

    // Esperar todos os uploads terminarem
    Promise.all(uploadTasks.map(task => {
        return new Promise((resolve, reject) => {
            task.on('state_changed',
                null,
                reject,
                resolve
            );
        });
    }))
    .then(async () => {
        alert('Todos os arquivos foram enviados com sucesso!');
        await fetchAllFiles();
        fileInput.value = '';
        progressContainer.style.display = 'none';
        progressContainer.innerHTML = '';
        isUploading = false;
    })
    .catch((error) => {
        console.error('Erro durante os uploads múltiplos:', error);
        alert(`Erro durante os uploads múltiplos: ${error.code} - ${error.message}`);
        progressContainer.style.display = 'none';
        progressContainer.innerHTML = '';
        isUploading = false;
    });
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
                            size: Number(metadata.size)
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
                fileList.innerHTML = '';
                updateStorageUsage();
            }
        } catch (error) {
            console.error('Erro ao listar arquivos:', error);
        }
    } else {
        console.log('Usuário não autenticado.');
    }
}

// Função para exibir a lista de arquivos
function displayFiles(files) {
    fileList.innerHTML = '';
    files.forEach(file => {
        const listItem = document.createElement('li');
        const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.mkv') || file.name.endsWith('.webm');

        listItem.innerHTML = `
            <span>${file.name} (${formatBytes(file.size)})</span>
            <div>
                ${isVideo ? `<button class="play-button">Reproduzir</button>` : ''}
                <a href="${file.url}" class="download-button" download="${file.name}">Download</a>
                <button class="share-button">Copiar Link</button>
                <button class="delete-button">Excluir</button>
            </div>
        `;
        fileList.appendChild(listItem);

        // Adicionar event listeners aos botões
        if (isVideo) {
            const playButton = listItem.querySelector('.play-button');
            playButton.addEventListener('click', () => {
                playVideo(file.url);
            });
        }

        const shareButton = listItem.querySelector('.share-button');
        shareButton.addEventListener('click', () => {
            copyToClipboard(file.url);
        });

        const deleteButton = listItem.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => {
            deleteFile(file.name);
        });
    });
    updateStorageUsage();
}

// Função para reproduzir vídeo
function playVideo(url) {
    videoPlayerSection.style.display = 'block';

    // Destruir o player anterior se existir
    if (videoPlayer) {
        videoPlayer.dispose();
    }

    // Remover o elemento de vídeo anterior
    const videoContainer = document.getElementById('video-player-container');
    videoContainer.innerHTML = '';

    // Criar um novo elemento de vídeo
    const videoElement = document.createElement('video');
    videoElement.id = 'video-player';
    videoElement.className = 'video-js vjs-default-skin';
    videoElement.setAttribute('controls', '');
    videoElement.setAttribute('preload', 'auto');
    videoContainer.appendChild(videoElement);

    // Inicializar o player
    videoPlayer = videojs('video-player', {
        autoplay: true,
        controls: true,
        sources: [{ src: url, type: getMimeType(url) }],
        fluid: true, // Faz o player ser responsivo
        responsive: true
    }, function() {
        // Callback após o player estar pronto
        addCustomButtons(); // Adicionar os botões personalizados
    });

    // Deslocar a página para o player de vídeo
    videoPlayerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Função para adicionar botões personalizados ao player
function addCustomButtons() {
    // Evitar adicionar múltiplos botões se já existirem
    if (videoPlayer.getChild('controlBar').getChild('RewindButton')) return;

    // Botão de Retroceder 10 Segundos
    const rewindButton = videojs.extend(videojs.getComponent('Button'), {
        constructor: function() {
            videojs.getComponent('Button').apply(this, arguments);
            this.controlText('Retroceder 10 segundos');
            this.addClass('vjs-control');
            this.addClass('vjs-button');
            this.addClass('vjs-rewind-button');
            this.el().innerHTML = '<i class="fas fa-undo"></i>'; // Ícone Font Awesome
        },
        handleClick: function() {
            const currentTime = videoPlayer.currentTime();
            videoPlayer.currentTime(Math.max(0, currentTime - 10));
        }
    });
    videojs.registerComponent('RewindButton', rewindButton);
    videoPlayer.getChild('controlBar').addChild('RewindButton', {}, 0); // Adiciona no início da barra de controles

    // Botão de Avançar 10 Segundos
    const forwardButton = videojs.extend(videojs.getComponent('Button'), {
        constructor: function() {
            videojs.getComponent('Button').apply(this, arguments);
            this.controlText('Avançar 10 segundos');
            this.addClass('vjs-control');
            this.addClass('vjs-button');
            this.addClass('vjs-forward-button');
            this.el().innerHTML = '<i class="fas fa-redo"></i>'; // Ícone Font Awesome
        },
        handleClick: function() {
            const currentTime = videoPlayer.currentTime();
            const duration = videoPlayer.duration();
            videoPlayer.currentTime(Math.min(duration, currentTime + 10));
        }
    });
    videojs.registerComponent('ForwardButton', forwardButton);
    videoPlayer.getChild('controlBar').addChild('ForwardButton', {}, 2); // Adiciona após o botão de play/pause

    // Botão de Download
    const downloadButton = videojs.extend(videojs.getComponent('Button'), {
        constructor: function() {
            videojs.getComponent('Button').apply(this, arguments);
            this.controlText('Download Vídeo');
            this.addClass('vjs-control');
            this.addClass('vjs-button');
            this.addClass('vjs-download-button');
            this.el().innerHTML = '<i class="fas fa-download"></i>'; // Ícone de download
        },
        handleClick: function() {
            downloadCurrentVideo();
        }
    });
    videojs.registerComponent('DownloadButton', downloadButton);
    // Adicionar o botão de download antes do botão de tela cheia
    videoPlayer.getChild('controlBar').addChild('DownloadButton', {}, videoPlayer.getChild('controlBar').children().length - 1);

    // Botão de Incorporação
    const embedButton = videojs.extend(videojs.getComponent('Button'), {
        constructor: function() {
            videojs.getComponent('Button').apply(this, arguments);
            this.controlText('Copiar Código de Incorporação');
            this.addClass('vjs-control');
            this.addClass('vjs-button');
            this.addClass('vjs-embed-button');
            this.el().innerHTML = '<i class="fas fa-code"></i>'; // Ícone de código
        },
        handleClick: function() {
            copyEmbedCode();
        }
    });
    videojs.registerComponent('EmbedButton', embedButton);
    // Adicionar o botão de incorporação antes do botão de tela cheia
    videoPlayer.getChild('controlBar').addChild('EmbedButton', {}, videoPlayer.getChild('controlBar').children().length - 1);
}

// Função para baixar o vídeo atual
function downloadCurrentVideo() {
    const videoUrl = videoPlayer.currentSrc();
    const videoName = videoUrl.substring(videoUrl.lastIndexOf('/') + 1).split('?')[0];

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = videoName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Função para copiar o código de incorporação para a área de transferência
function copyEmbedCode() {
    const videoUrl = videoPlayer.currentSrc();
    const embedPageUrl = `https://uparchive.github.io/uploadgalaxy/embed.html?videoUrl=${encodeURIComponent(videoUrl)}`;
    const embedCode = `<iframe src="${embedPageUrl}" frameborder="0" allowfullscreen></iframe>`;

    navigator.clipboard.writeText(embedCode).then(() => {
        alert('Código de incorporação copiado para a área de transferência!');
    }).catch((error) => {
        console.error('Erro ao copiar o código de incorporação:', error);
        alert('Erro ao copiar o código de incorporação. Tente novamente.');
    });
}

// Função para obter o tipo MIME do vídeo
function getMimeType(url) {
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
        case 'mp4':
            return 'video/mp4';
        case 'mkv':
            return 'video/x-matroska';
        case 'webm':
            return 'video/webm';
        default:
            return 'video/mp4';
    }
}

// Função para ordenar os arquivos
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
        e.returnValue = '';
    }
});

// Exibir/ocultar o botão de voltar ao topo com base no scroll
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 200) {
        backToTopButton.style.display = 'block';
    } else {
        backToTopButton.style.display = 'none';
    }
});

// Anexar funções ao objeto window para torná-las acessíveis globalmente
window.copyToClipboard = copyToClipboard;
window.deleteFile = deleteFile;
window.playVideo = playVideo;
