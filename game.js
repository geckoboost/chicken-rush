// ==========================================================================
// 0. CONFIGURATION & INITIALISATION FIREBASE (Avec Auth et Firestore)
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBi_GBqDSbiIhbSYqt8rTu1k3boQwIQ_gQ",
  authDomain: "chicken-rush-8f0f2.firebaseapp.com",
  projectId: "chicken-rush-8f0f2",
  storageBucket: "chicken-rush-8f0f2.firebasestorage.app",
  messagingSenderId: "588961258369",
  appId: "1:588961258369:web:934af13c005bd4a841e680"
};

let db = null;
let auth = null;
let currentAuthMode = "signup"; // "signup" (Inscription) ou "login" (Connexion)

(async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const { getAuth, onAuthStateChanged, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("✅ Firebase & Auth prêts");

    // Écouteur d'état de connexion de l'utilisateur
		onAuthStateChanged(auth, (user) => {
				const loginBtn = document.getElementById("login-btn");
				if (user && loginBtn) {
					const pseudo = user.displayName || "Joueur";
					localStorage.setItem("playerPseudo", pseudo);
					loginBtn.innerHTML = `👤 Profil : <strong>${pseudo}</strong>`;

					// 👑 VERIFICATION DES DROITS ADMIN
					if (user.email === ADMIN_EMAIL && adminResetBtn) {
						adminResetBtn.style.display = "block"; // Affiche le bouton secret
					}
				} else {
					localStorage.removeItem("playerPseudo");
					if (loginBtn) loginBtn.innerHTML = `🔐 SE CONNECTER / S'INSCRIRE`;
					if (adminResetBtn) adminResetBtn.style.display = "none"; // Cache le bouton
				}
			});

  } catch (e) {
    console.warn("⚠️ Firebase indisponible — mode local actif :", e);
  }
})();

// ==========================================================================
// 1. ÉLÉMENTS DU DOM & VARIABLES GLOBALES
// ==========================================================================
const adminResetBtn = document.getElementById("admin-reset-btn");
const ADMIN_EMAIL = "christophe.gineste@hotmail.fr"; // 👈 REMPLACEZ PAR VOTRE EMAIL FIREBASE
const game = document.getElementById("game");
const introScreen = document.getElementById("intro-screen");
const gameOverScreen = document.getElementById("game-over");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const scoreSpan = document.getElementById("score");
const finalScoreSpan = document.getElementById("final-score");
const timerSpan = document.getElementById("timer");
const heartsContainer = document.getElementById("hearts-container"); 

const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");
const highScoresList = document.getElementById("high-scores-list");
const loginBtn = document.getElementById("login-btn");
const muteBtn = document.getElementById("mute-btn");

// Éléments de la fenêtre d'authentification (Modal)
const authModal = document.getElementById("auth-modal");
const authTitle = document.getElementById("auth-title");
const authPseudoInput = document.getElementById("auth-pseudo");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authSwitchText = document.getElementById("auth-switch-text");
const authCloseBtn = document.getElementById("auth-close-btn");

// AUDIO & EFFETS SONORES
const soundBgm = new Audio("assets/sounds/bg-music.mp3");
const soundMenuBgm = new Audio("assets/sounds/menu-music.mp3");
const soundCatch = new Audio("assets/sounds/catch-insect.mp3");
const soundCombo = new Audio("assets/sounds/combo.mp3");
const soundDanger = new Audio("assets/sounds/hit-danger.mp3");
const soundFoxHit = new Audio("assets/sounds/fox-hit.mp3");
const soundGameOver = new Audio("assets/sounds/game-over.mp3");
const soundLevelUp = new Audio("assets/sounds/level-up.mp3"); 

soundCombo.volume = 0.5; 
soundBgm.loop = true;
soundBgm.volume = 0.2; 
soundMenuBgm.loop = true;
soundMenuBgm.volume = 0.2;
let isMuted = false;

let score = 0;
let lives = 3;
let timeLeft = 90;
let currentLevel = 1;
let animationFrameId; 
let spawnInterval;
let timerInterval;
let cloudInterval; 
let isGameRunning = false;
let wormComboCount = 0; 

let levelBanner = document.createElement("div");
levelBanner.classList.add("sky-level-display");
levelBanner.textContent = "NIVEAU 1";

let chicken = document.createElement("div");
chicken.classList.add("chicken");
let chickenLeft = 106; 
chicken.style.left = chickenLeft + "px";

let itemSpeed = 4;
let spawnSpeed = 1000; 

const keys = { left: false, right: false };
const CHICKEN_SPEED = 8; 

function startMobileBlink() {
    const promoText = document.querySelector(".promo-text");
    if (promoText) {
        setInterval(() => {
            promoText.style.opacity = (promoText.style.opacity === "0.2") ? "1" : "0.2";
        }, 750);
    }
}
window.addEventListener("DOMContentLoaded", startMobileBlink);

// ==========================================================================
// 2. ÉCOUTEURS D'ÉVÉNEMENTS & SYSTÈME D'AUTHENTIFICATION (CONNEXION COMPTE)
// ==========================================================================

// 👉 Bouton JOUER
if (startBtn) {
    startBtn.addEventListener("click", () => {
        if (introScreen) introScreen.classList.add("hidden");
        initGame();
    });
}

// Bouton Mute
muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    if (isMuted) {
        soundBgm.pause(); soundMenuBgm.pause();
        muteBtn.textContent = "🔇"; muteBtn.classList.add("muted");
    } else {
        if (isGameRunning) soundBgm.play().catch(e => console.log(e)); 
        else soundMenuBgm.play().catch(e => console.log(e));
        muteBtn.textContent = "🔊"; muteBtn.classList.remove("muted");
    }
});

// Clic sur le bouton de connexion principal -> Ouvre la fenêtre d'authentification
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        if (auth && auth.currentUser) {
            // Si déjà connecté, propose de se déconnecter
            const deconnexion = confirm(`Vous êtes connecté en tant que "${auth.currentUser.displayName}". Voulez-vous vous déconnecter ?`);
            if (deconnexion) {
                auth.signOut().then(() => alert("Déconnecté !"));
            }
        } else {
            // Sinon ouvre la boîte de dialogue
            if (authModal) {
                authModal.style.display = "flex";
                authModal.classList.remove("hidden");
            }
        }
    });
}

// Fermer la fenêtre d'authentification
if (authCloseBtn) {
    authCloseBtn.addEventListener("click", () => {
        if (authModal) {
            authModal.style.display = "none";
            authModal.classList.add("hidden");
        }
    });
}

// Basculer entre Inscription (Sign up) et Connexion (Login)
if (authSwitchText) {
    authSwitchText.addEventListener("click", () => {
        if (currentAuthMode === "signup") {
            currentAuthMode = "login";
            authTitle.textContent = "Connexion";
            authPseudoInput.parentElement.style.display = "none"; // Cache le pseudo pour la connexion
            authSwitchText.textContent = "Pas de compte ? Inscrivez-vous ici";
        } else {
            currentAuthMode = "signup";
            authTitle.textContent = "Créer un compte";
            authPseudoInput.parentElement.style.display = "block"; // Affiche le pseudo pour l'inscription
            authSwitchText.textContent = "Déjà un compte ? Connectez-vous ici";
        }
    });
}

// Soumission du formulaire d'authentification (Bouton Valider)
if (authSubmitBtn) {
    authSubmitBtn.addEventListener("click", async () => {
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value.trim();
        const pseudo = authPseudoInput.value.trim();

        if (!email || !password) {
            alert("Veuillez remplir l'adresse e-mail et le mot de passe.");
            return;
        }

        const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

        authSubmitBtn.textContent = "Chargement... ⏳";
        authSubmitBtn.disabled = true;

        try {
            if (currentAuthMode === "signup") {
                // INSCRIPTION
                if (!pseudo) {
                    alert("Veuillez choisir un pseudo.");
                    authSubmitBtn.textContent = "Valider"; authSubmitBtn.disabled = false;
                    return;
                }

                // Vérification si le pseudo est déjà pris dans la base des scores
                if (db) {
                    const qCheck = query(collection(db, "leaderboard"), where("name", "==", pseudo));
                    const checkSnapshot = await getDocs(qCheck);
                    if (!checkSnapshot.empty) {
                        alert(`❌ Le pseudo "${pseudo}" est déjà pris par un autre joueur.`);
                        authSubmitBtn.textContent = "Valider"; authSubmitBtn.disabled = false;
                        return;
                    }
                }

                // Création du compte Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Enregistrement du pseudo dans le profil Firebase
                await updateProfile(userCredential.user, { displayName: pseudo });
                
                alert(`Compte créé avec succès ! Bienvenue ${pseudo} 🎉`);
            } else {
                // CONNEXION
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                alert(`Ravi de vous revoir ${userCredential.user.displayName || "Joueur"} ! 👋`);
            }

            // Fermeture de la fenêtre après succès
            authModal.style.display = "none";
            authModal.classList.add("hidden");

            // Si une partie vient d'être finie, on pousse le score automatiquement
            if (score > 0 && !isGameRunning) {
                const userPseudo = auth.currentUser.displayName || pseudo;
                submitWeeklyScore(userPseudo, score);
            }

        } catch (error) {
            console.error(error);
            if (error.code === "auth/email-already-in-use") alert("Cette adresse e-mail est déjà associée à un compte.");
            else if (error.code === "auth/weak-password") alert("Le mot de passe doit contenir au moins 6 caractères.");
            else if (error.code === "auth/invalid-email") alert("Format de l'adresse e-mail invalide.");
            else if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found") alert("Identifiants incorrects.");
            else alert("Une erreur est survenue lors de l'authentification : " + error.message);
        } finally {
            authSubmitBtn.textContent = "Valider";
            authSubmitBtn.disabled = false;
        }
    });
}

if (restartBtn) {
    restartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        gameOverScreen.classList.add("hidden");
        soundMenuBgm.pause();
        initGame();
    });
}

document.addEventListener("click", () => {
    if (!isGameRunning && gameOverScreen.classList.contains("hidden") && !isMuted) {
        soundMenuBgm.play().catch(e => console.log("Attente interaction", e));
    }
}, { once: true });

// Controles Clavier & Tactiles
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
});
document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
});

const startLeftMove = (e) => { e.preventDefault(); keys.left = true; };
const stopLeftMove = (e) => { e.preventDefault(); keys.left = false; };
const startRightMove = (e) => { e.preventDefault(); keys.right = true; };
const stopRightMove = (e) => { e.preventDefault(); keys.right = false; };

if (btnLeft && btnRight) {
    btnLeft.addEventListener("mousedown", startLeftMove); btnLeft.addEventListener("mouseup", stopLeftMove); btnLeft.addEventListener("mouseleave", stopLeftMove);
    btnLeft.addEventListener("touchstart", startLeftMove, { passive: false }); btnLeft.addEventListener("touchend", stopLeftMove);
    btnRight.addEventListener("mousedown", startRightMove); btnRight.addEventListener("mouseup", stopRightMove); btnRight.addEventListener("mouseleave", stopRightMove);
    btnRight.addEventListener("touchstart", startRightMove, { passive: false }); btnRight.addEventListener("touchend", stopRightMove);
}

// ==========================================================================
// 3. LOGIQUE & BOUCLE DU JEU
// ==========================================================================

function initGame() {
    soundMenuBgm.pause();
    if (!isMuted) {
        soundBgm.currentTime = 0;
        soundBgm.play().catch(e => console.log("Attente action joueur", e));
    }

    score = 0; lives = 3; timeLeft = 90; currentLevel = 1; itemSpeed = 4; spawnSpeed = 1000; isGameRunning = true; wormComboCount = 0;
    generateClouds();
    keys.left = false; keys.right = false;
    scoreSpan.textContent = score; timerSpan.textContent = timeLeft;
    updateHeartsDisplay();

    const oldItems = game.querySelectorAll(".item");
    oldItems.forEach(item => item.remove());

    if (!game.contains(levelBanner)) game.appendChild(levelBanner);
    if (!game.contains(chicken)) game.insertBefore(chicken, document.getElementById("touchpad"));
    
    chickenLeft = 106; chicken.style.left = chickenLeft + "px"; chicken.style.display = "block"; 
    passToLevel(1, 4, 1000);

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isGameRunning) return;
        timeLeft--;
        timerSpan.textContent = timeLeft;

        if (timeLeft === 60) passToLevel(2, 6, 800);
        else if (timeLeft === 30) passToLevel(3, 8, 600);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame("temps_ecoule"); 
        }
    }, 1000);
}

function passToLevel(level, speed, spawnRate) {
    currentLevel = level; itemSpeed = speed; spawnSpeed = spawnRate;
    levelBanner.textContent = `NIVEAU ${level}`;
    levelBanner.classList.remove("pulse-animation");
    void levelBanner.offsetWidth; 
    levelBanner.classList.add("pulse-animation");

    if (level > 1) {
        soundLevelUp.currentTime = 0;
        soundLevelUp.play().catch(e => console.log("Erreur audio niveau :", e));
    }
    clearInterval(spawnInterval);
    if (isGameRunning) spawnInterval = setInterval(spawnItem, spawnSpeed);
}

function updateHeartsDisplay() {
    if (heartsContainer) heartsContainer.textContent = "❤️".repeat(lives);
}

function gameLoop() {
    if (!isGameRunning) return;

    const gameWidth = game ? game.clientWidth : 500;
    const chickenWidth = chicken.offsetWidth || 288;

    if (keys.left && chickenLeft > -75) chickenLeft -= CHICKEN_SPEED;
    const maxRightPosition = gameWidth - (chickenWidth - 198); 
    if (keys.right && chickenLeft < maxRightPosition) chickenLeft += CHICKEN_SPEED;
    chicken.style.left = chickenLeft + "px";

    const items = game.querySelectorAll(".item");
    const chickenRect = chicken.getBoundingClientRect();
    const chickenHitbox = {
        top: chickenRect.top + 195, bottom: chickenRect.bottom - 60,
        left: chickenRect.left + 80, right: chickenRect.right - 100   
    };

    items.forEach(item => {
        let itemTop = parseFloat(item.style.top) || 0;
        itemTop += itemSpeed;
        item.style.top = itemTop + "px";

        const itemRect = item.getBoundingClientRect();
        if (
            itemRect.bottom >= chickenHitbox.top && itemRect.top <= chickenHitbox.bottom &&   
            itemRect.right >= chickenHitbox.left && itemRect.left <= chickenHitbox.right
        ) {
            handleCollision(item);
        } else if (itemTop > 700) {
            if (item.dataset.value !== "fox" && item.dataset.value !== "crow" && item.dataset.value !== "weasel") wormComboCount = 0; 
            item.remove();
        }
    });
    animationFrameId = requestAnimationFrame(gameLoop);
}

function spawnItem() {
    if (!isGameRunning) return;
    const item = document.createElement("div");
    item.classList.add("item");

    const types = [
        { name: "worm", val: "10", img: "url('assets/worm.png')", prob: 0.35 },
        { name: "bug", val: "25", img: "url('assets/bug.png')", prob: 0.20 },
        { name: "grasshopper", val: "50", img: "url('assets/grasshopper.png')", prob: 0.10 },
        { name: "crow", val: "-50", img: "url('assets/crow.png')", prob: 0.15 },
        { name: "weasel", val: "-100", img: "url('assets/weasel.png')", prob: 0.12 },
        { name: "fox", val: "fox", img: "url('assets/fox.png')", prob: 0.08 }
    ];

    let rand = Math.random(); let cumulativeProb = 0; let chosenType = types[0];
    for (let t of types) {
        cumulativeProb += t.prob;
        if (rand <= cumulativeProb) { chosenType = t; break; }
    }

    item.style.backgroundImage = chosenType.img;
    item.dataset.value = chosenType.val;

    const gameWidth = game ? game.clientWidth : 500;
    const maxAllowedRight = gameWidth - 48; 
    const randomLeft = Math.max(0, Math.min(maxAllowedRight, Math.floor(Math.random() * gameWidth) - 30));
    item.style.left = randomLeft + "px"; item.style.top = "-48px";
    game.appendChild(item);
}

function handleCollision(item) {
    const value = item.dataset.value;
    let textEffect = ""; let effectClass = "";
    const bgImg = item.style.backgroundImage || "";
    const isWorm = bgImg.includes("worm.png");
    const isInsect = bgImg.includes("worm.png") || bgImg.includes("bug.png") || bgImg.includes("grasshopper.png");

    if (value === "fox") {
        lives--; updateHeartsDisplay();
        textEffect = "-1 Vie !"; effectClass = "life-lost"; wormComboCount = 0;
        soundFoxHit.currentTime = 0; soundFoxHit.play().catch(e => console.log(e));
        if (lives <= 0) endGame("vies_perdues"); 
    } else {
        const points = parseInt(value);
        score += points; if (score < 0) score = 0;

        if (points > 0) {
            textEffect = `+${points}`; effectClass = "positive";
            let comboTriggered = false;

            if (isWorm) {
                wormComboCount++;
                if (wormComboCount === 3) {
                    score += 30; textEffect = "COMBO VER ! +30"; effectClass = "positive";
                    showComboBanner();
                    soundCombo.currentTime = 0; soundCombo.play().catch(e => console.log(e));
                    comboTriggered = true; wormComboCount = 0;
                }
            } else { wormComboCount = 0; }

            if (!comboTriggered && isInsect) {
                soundCatch.currentTime = 0; soundCatch.play().catch(e => console.log(e));
            }
        } else {
            textEffect = `${points}`; effectClass = "negative"; wormComboCount = 0;
            soundDanger.currentTime = 0; soundDanger.play().catch(e => console.log(e));
        }
        scoreSpan.textContent = score;

        if (score > 2000) {
            createFloatingText("🔥 BONUS EXPERT ACTIVÉ ! 🔥", "positive", chicken.style.left, "140px");
        }
    }
    createFloatingText(textEffect, effectClass, item.style.left, item.style.top);
    item.remove();
}

function createFloatingText(text, className, left, top) {
    const txt = document.createElement("div");
    txt.classList.add("floating-text", className);
    txt.textContent = text; txt.style.left = left; txt.style.top = top;
    game.appendChild(txt);
    setTimeout(() => { txt.remove(); }, 800);
}

function showComboBanner() {
    const banner = document.createElement("div");
    banner.classList.add("combo-banner"); banner.innerText = "BONUS 3 VERS ! +30pts";
    game.appendChild(banner);
    setTimeout(() => { banner.remove(); }, 1500);
}

function endGame(reason) {
    isGameRunning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    clearInterval(spawnInterval); clearInterval(timerInterval); clearInterval(cloudInterval); 
    soundBgm.pause(); soundBgm.currentTime = 0;

    if (reason === "vies_perdues") {
        soundGameOver.currentTime = 0; soundGameOver.play().catch(e => console.log(e));
        soundGameOver.onended = () => {
            if (!isMuted && !isGameRunning) {
                soundMenuBgm.currentTime = 0; soundMenuBgm.play().catch(e => console.log(e));
            }
        };
    } else {
        if (!isMuted) { soundMenuBgm.currentTime = 0; soundMenuBgm.play().catch(e => console.log(e)); }
    }

    keys.left = false; keys.right = false;
    if (game.contains(levelBanner)) levelBanner.remove();
    if (chicken) chicken.style.display = "none"; 

    const items = game.querySelectorAll(".item");
    items.forEach(item => item.remove());

    finalScoreSpan.textContent = score;

    // 🚀 ENVOI AUTOMATIQUE DES SCORES SI LE JOUEUR EST CONNECTÉ À UN COMPTE
    if (auth && auth.currentUser && score > 0) {
        const userPseudo = auth.currentUser.displayName || "Joueur anonyme";
        submitWeeklyScore(userPseudo, score);
    } else {
        loadWeeklyLeaderboard(); 
    }
    
    handleHighScores(score);
    if (gameOverScreen) gameOverScreen.classList.remove("hidden");

    const forceAudioOnGameOverClick = () => {
        if (!isGameRunning && !gameOverScreen.classList.contains("hidden") && !isMuted) soundMenuBgm.play().catch(e => console.log(e));
        gameOverScreen.removeEventListener("click", forceAudioOnGameOverClick);
    };
    gameOverScreen.addEventListener("click", forceAudioOnGameOverClick);
}

function handleHighScores(currentScore) {
    let localScores = localStorage.getItem("chickenRushScores");
    let scoresArray = localScores ? JSON.parse(localScores) : [];
    scoresArray.push(currentScore); scoresArray.sort((a, b) => b - a); scoresArray = scoresArray.slice(0, 3);
    localStorage.setItem("chickenRushScores", JSON.stringify(scoresArray));
}

function generateClouds() {
    const existingClouds = game.querySelectorAll(".cloud");
    existingClouds.forEach(c => c.remove());
    for (let i = 0; i < 4; i++) createSingleCloud(true);
    clearInterval(cloudInterval);
    cloudInterval = setInterval(() => { createSingleCloud(false); }, 6000);
}

function createSingleCloud(randomStart) {
    if (!isGameRunning && randomStart === false) return;
    const cloud = document.createElement("div");
    cloud.classList.add("cloud");
    const width = Math.floor(Math.random() * 260) + 240; const height = width * 0.4; 
    cloud.style.width = width + "px"; cloud.style.height = height + "px";
    const topPosition = Math.random() * 320; cloud.style.top = topPosition + "px";
    const duration = Math.random() * 15 + 15; cloud.style.animation = `moveCloud ${duration}s linear infinite`;
    if (randomStart) { const randomDelay = Math.random() * -duration; cloud.style.animationDelay = `${randomDelay}s`; }
    game.insertBefore(cloud, game.firstChild);
}

// ==========================================================================
// SYSTÈME DE CLASSEMENT DE LA SEMAINE (FIREBASE)
// ==========================================================================

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() };
}

async function submitWeeklyScore(pseudo, gameScore) {
    if (!pseudo || !db) return;
    const timeInfo = getWeekNumber(new Date());
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    
    try {
        await addDoc(collection(db, "leaderboard"), {
            name: pseudo,
            score: Number(gameScore),
            date: new Date(),
            week: timeInfo.week,
            year: timeInfo.year
        });
        console.log("Score envoyé !");
        loadWeeklyLeaderboard(); 
    } catch (e) {
        console.error("Erreur Firebase d'écriture : ", e);
    }
}

async function loadWeeklyLeaderboard() {
    if (!highScoresList) return;
    highScoresList.innerHTML = "<li style='list-style:none;text-align:center;'>Mise à jour du classement... ⏳</li>";
    const timeInfo = getWeekNumber(new Date());

    if (!db) {
         highScoresList.innerHTML = "<li style='list-style:none;text-align:center;color:#ff8a80;'>Serveur indisponible.</li>";
         return;
    }

    const { collection, getDocs, query, orderBy, limit, where } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    try {
        const q = query(
            collection(db, "leaderboard"), 
            where("week", "==", timeInfo.week),
            where("year", "==", timeInfo.year),
            orderBy("score", "desc"), 
            limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        highScoresList.innerHTML = ""; 

        if (querySnapshot.empty) {
            highScoresList.innerHTML = "<li style='list-style:none;text-align:center;'>Aucun score cette semaine. Soyez le premier ! 🥇</li>";
            return;
        }

        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement("li");
            let badge = `${rank}.`;
            if (rank === 1) badge = "👑 1er";
            if (rank === 2) badge = "🥈 2e";
            if (rank === 3) badge = "🥉 3e";
            
            li.innerHTML = `<span>${badge} ${data.name}</span> <strong style="color:#ffca28;">${data.score} pts</strong>`;
            highScoresList.appendChild(li);
            rank++;
        });
    } catch (e) {
        highScoresList.innerHTML = "<li style='list-style:none;text-align:center;color:#ff8a80;'>Classement indisponible.</li>";
    }
}

// ==========================================================================
// FONCTIONNALITÉ ADMINISTRATEUR : NETTOYAGE DE LA SEMAINE
// ==========================================================================
if (adminResetBtn) {
    adminResetBtn.addEventListener("click", async () => {
        if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) {
            alert("Action non autorisée.");
            return;
        }

        const confirmation = confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer TOUS les scores de la semaine en cours ? Cette action est irréversible.");
        if (!confirmation) return;

        adminResetBtn.textContent = "Suppression en cours... ⏳";
        adminResetBtn.disabled = true;

        const timeInfo = getWeekNumber(new Date());
        const { collection, getDocs, query, where, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

        try {
            // 1. On cible les scores de la semaine
            const q = query(
                collection(db, "leaderboard"),
                where("week", "==", timeInfo.week),
                where("year", "==", timeInfo.year)
            );
            
            const querySnapshot = await getDocs(q);
            
            // 2. On les supprime un par un (Firestore demande une suppression par document)
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });

            await Promise.all(deletePromises);
            
            alert("✅ Le classement de la semaine a été remis à zéro avec succès !");
            loadWeeklyLeaderboard(); // Rafraîchit l'affichage immédiatement

        } catch (error) {
            console.error("Erreur lors du reset Admin :", error);
            alert("Une erreur est survenue : " + error.message);
        } finally {
            adminResetBtn.textContent = "⚙️ Zone Admin : Reset de la Semaine";
            adminResetBtn.disabled = false;
        }
    });
}