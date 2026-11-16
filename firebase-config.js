// 1) Cole aqui a configuração do seu app web (Console do Firebase > Configurações do projeto > Seus apps > Config).
//    Essa configuração NÃO é segredo: quem protege os dados são as regras (firestore.rules e database.rules.json).
window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  databaseURL: "https://SEU-PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU-PROJETO",
  appId: "COLE_AQUI"
};
// 2) Seu UID (Console > Authentication > Usuários, depois de entrar uma vez no jogo). Só esse UID vê o ✕ de moderação.
//    Coloque o MESMO UID em firestore.rules.
window.TRILHO_ADMIN_UID = "";
