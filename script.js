// Importações do Firebase Modular SDK
import { initializeApp, setLogLevel } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Habilitar logs detalhados do Firebase para depuração
setLogLevel('debug');

// Configuração do Firebase (Substitua pelas suas próprias credenciais)
const firebaseConfig = {
    apiKey: "AIzaSyAbADgKRicHlfDWoaXmIfU0EjGbU6nFkPQ",
    authDomain: "armazene-acd30.firebaseapp.com",
    projectId: "armazene-acd30",
    storageBucket: "armazene-acd30.appspot.com",
    messagingSenderId: "853849509051",
    appId: "1:853849509051:web:ea6f96915c4d5c895b2d9e",
    measurementId: "G-79TBH73QPT"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configuração do Bot Telegram
const CHAT_ID = '1277559138';  // Chat ID fornecido
const BOT_TOKEN = '7279799450:AAGnJRv0zNAbweCwpcTbHsgCo3Bo_9N8fiY';  // Token do bot

// Elementos do DOM
const loginSection = document.getElementById('login-section');
const uploadSection = document.getElementById('upload-section');
const fileListSection = document.getElementById('file-list-section');
const googleLoginButton = document.getElementById('google-login-button');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const renameFileList = document.getElementById('rename-file-list');
const toggleButton = document.getElementById('toggle-file-list-button');
const fileListContainer = document.getElementById('file-list-container');
const fileList = document.getElementById('file-list');
const logoutButton = document.getElementById('logout-button');

// Variáveis Globais
let isUploading = false;

// Monitorar o estado de autenticação do usuário
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.style.display = 'none';
        uploadSection.style.display = 'block';
        fileListSection.style.display = 'block';
        fetchUserFiles();  // Busca arquivos do usuário autenticado
    } else {
        loginSection.style.display = 'block';
        uploadSection.style.display = 'none';
        fileListSection.style.display = 'none';
    }
});

// Função para login com Google
googleLoginButton.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            alert('Login realizado com sucesso!');
        })
        .catch((error) => {
            alert(`Erro ao fazer login: ${error.message}`);
        });
});

// Evento para o formulário de upload
uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isUploading) {
        startUpload();
    }
});

// Função para Enviar Arquivo para o Bot do Telegram e Salvar URL no Firestore
async function uploadFileToTelegram(file, fileName) {
    const formData = new FormData();
    formData.append("chat_id", CHAT_ID);
    formData.append("document", file);

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        if (result.ok) {
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${result.result.document.file_id}`;
            const user = auth.currentUser;

            if (user) {
                await addDoc(collection(db, "user_uploads"), {
                    uid: user.uid,
                    fileName: fileName,
                    fileUrl: fileUrl,
                    uploadDate: new Date()
                });
                addFileToList({ name: fileName }, fileUrl);  // Adiciona o link à lista visível
                alert("Arquivo enviado e registrado com sucesso!");
            }
        } else {
            alert("Erro ao enviar arquivo. Veja o console para mais detalhes.");
        }
    } catch (error) {
        alert("Erro de conexão ao tentar enviar o arquivo.");
    }
}

// Função para iniciar o upload múltiplo
async function startUpload() {
    const files = fileInput.files;
    const user = auth.currentUser;

    if (!user) {
        alert('Você precisa estar logado para fazer o upload de arquivos.');
        return;
    }

    if (!files.length) {
        alert('Por favor, selecione pelo menos um arquivo antes de fazer o upload.');
        return;
    }

    isUploading = true;

    Array.from(files).forEach((file, index) => {
        const renameInput = document.getElementById(`rename-input-${index}`);
        const customFileName = renameInput && renameInput.value.trim() ? renameInput.value.trim() : file.name;
        uploadFileToTelegram(file, customFileName);
    });

    isUploading = false;
}

// Função para buscar arquivos do usuário no Firestore
async function fetchUserFiles() {
    const user = auth.currentUser;

    if (user) {
        const q = query(collection(db, "user_uploads"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        fileList.innerHTML = '';  // Limpar a lista antes de adicionar novos itens

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            addFileToList({ name: data.fileName }, data.fileUrl);
        });
    }
}

// Função para adicionar links dos arquivos enviados na lista
function addFileToList(file, fileUrl) {
    const listItem = document.createElement('li');
    listItem.className = 'file-item';
    listItem.innerHTML = `
        <span>${file.name}</span>
        <a href="${fileUrl}" target="_blank" class="download-button"><i class="fas fa-download"></i> Download</a>
        <button class="embed-button" onclick="copyEmbedCode('${fileUrl}')"><i class="fas fa-code"></i> Embed</button>
    `;
    fileList.appendChild(listItem);
}

// Função para copiar o código de incorporação para a área de transferência
function copyEmbedCode(fileUrl) {
    const embedCode = `<iframe src="${fileUrl}" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode).then(() => {
        alert('Código de incorporação copiado para a área de transferência!');
    }).catch((error) => {
        console.error('Erro ao copiar o código de incorporação:', error);
        alert('Erro ao copiar o código de incorporação. Tente novamente.');
    });
}

// Função para logout
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert('Você foi desconectado com sucesso.');
    } catch (error) {
        alert(`Erro ao desconectar: ${error.message}`);
    }
});

// Função para alternar visibilidade da lista de arquivos
toggleButton.addEventListener('click', () => {
    const currentDisplay = window.getComputedStyle(fileListContainer).display;

    fileListContainer.style.display = currentDisplay === 'none' ? 'block' : 'none';
    toggleButton.innerHTML = currentDisplay === 'none' ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
});
