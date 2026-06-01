// ==========================================================================
// 1. ÉLÉMENTS DU DOM & VARIABLES GLOBALES
// ==========================================================================
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

// ==========================================================================
// AUDIO & EFFETS SONORES (Fichiers externes)
// ==========================================================================
const soundBgm = new Audio("assets/sounds/bg-music.mp3");
const soundMenuBgm = new Audio("assets/sounds/menu-music.mp3"); // 🎵 Musique d'intro et fin
const soundCatch = new Audio("assets/sounds/catch-insect.mp3");
const soundCombo = new Audio("assets/sounds/combo.mp3");
const soundDanger = new Audio("assets/sounds/hit-danger.mp3");  // 🦅/🪵 Pour le Corbeau et la Fouine
const soundFoxHit = new Audio("assets/sounds/fox-hit.mp3");      // 🦊 Dédié uniquement au Renard
const soundGameOver = new Audio("assets/sounds/game-over.mp3");
const soundLevelUp = new Audio("assets/sounds/level-up.mp3"); 

// Configurations et volumes par défaut
soundCombo.volume = 0.5; 
soundBgm.loop = true;
soundBgm.volume = 0.2; 
soundMenuBgm.loop = true;
soundMenuBgm.volume = 0.2;
let isMuted = false;

// Variables logiques de session
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

// Création dynamique de l'affichage du niveau dans le ciel
let levelBanner = document.createElement("div");
levelBanner.classList.add("sky-level-display");
levelBanner.textContent = "NIVEAU 1";

// Création du conteneur physique de la poule
let chicken = document.createElement("div");
chicken.classList.add("chicken");
let chickenLeft = 106; 
chicken.style.left = chickenLeft + "px";

let itemSpeed = 4;
let spawnSpeed = 1000; 

// État des touches
const keys = {
    left: false,
    right: false
};

const CHICKEN_SPEED = 8; 

// ==========================================================================
// 2. ÉCOUTEURS D'ÉVÉNEMENTS (CONTROLES ET BOUTONS)
// ==========================================================================

// Bouton Mute : Coupe/Relance uniquement les musiques de fond, pas les bruitages
muteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Évite de déclencher la lecture automatique globale
    isMuted = !isMuted;
    
    if (isMuted) {
        soundBgm.pause(); 
        soundMenuBgm.pause();
        muteBtn.textContent = "🔇";
        muteBtn.classList.add("muted");
    } else {
        if (isGameRunning) {
            soundBgm.play().catch(e => console.log(e)); 
        } else {
            soundMenuBgm.play().catch(e => console.log(e));
        }
        muteBtn.textContent = "🔊";
        muteBtn.classList.remove("muted");
    }
});

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        alert("Bientôt disponible : Cette fonction vous permettra de vous connecter via Facebook ou un compte client pour débloquer le classement mondial et vos réductions !");
    });
}

if (startBtn) {
    startBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Évite les conflits d'instructions audio
        introScreen.classList.add("hidden");
        soundMenuBgm.pause();
        initGame();
    });
}

if (restartBtn) {
    restartBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Évite les conflits d'instructions audio
        gameOverScreen.classList.add("hidden");
        soundMenuBgm.pause();
        initGame();
    });
}

// Lancement automatique de l'ambiance dès le premier clic n'importe où sur l'écran
document.addEventListener("click", () => {
    if (!isGameRunning && gameOverScreen.classList.contains("hidden") && !isMuted) {
        soundMenuBgm.play().catch(e => console.log("Attente interaction", e));
    }
}, { once: true });

// Clavier
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "q" || e.key === "Q") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
});

// Mobile et Souris Tactile
const startLeftMove = (e) => { e.preventDefault(); keys.left = true; };
const stopLeftMove = (e) => { e.preventDefault(); keys.left = false; };
const startRightMove = (e) => { e.preventDefault(); keys.right = true; };
const stopRightMove = (e) => { e.preventDefault(); keys.right = false; };

if (btnLeft && btnRight) {
    btnLeft.addEventListener("mousedown", startLeftMove);
    btnLeft.addEventListener("mouseup", stopLeftMove);
    btnLeft.addEventListener("mouseleave", stopLeftMove);
    btnLeft.addEventListener("touchstart", startLeftMove, { passive: false });
    btnLeft.addEventListener("touchend", stopLeftMove);

    btnRight.addEventListener("mousedown", startRightMove);
    btnRight.addEventListener("mouseup", stopRightMove);
    btnRight.addEventListener("mouseleave", stopRightMove);
    btnRight.addEventListener("touchstart", startRightMove, { passive: false });
    btnRight.addEventListener("touchend", stopRightMove);
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

    score = 0;
    lives = 3;
    timeLeft = 90; 
    currentLevel = 1;
    itemSpeed = 4;
    spawnSpeed = 1000;
    isGameRunning = true;
    wormComboCount = 0;

    generateClouds();

    keys.left = false;
    keys.right = false;

    scoreSpan.textContent = score;
    timerSpan.textContent = timeLeft;
    updateHeartsDisplay();

    const oldItems = game.querySelectorAll(".item");
    oldItems.forEach(item => item.remove());

    if (!game.contains(levelBanner)) {
        game.appendChild(levelBanner);
    }

    if (!game.contains(chicken)) {
        game.insertBefore(chicken, document.getElementById("touchpad"));
    }
    chickenLeft = 106; 
    chicken.style.left = chickenLeft + "px";
    chicken.style.display = "block"; 

    passToLevel(1, 4, 1000);

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
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
    currentLevel = level;
    itemSpeed = speed;
    spawnSpeed = spawnRate;

    levelBanner.textContent = `NIVEAU ${level}`;
    
    levelBanner.classList.remove("pulse-animation");
    void levelBanner.offsetWidth; 
    levelBanner.classList.add("pulse-animation");

    if (level > 1) {
        soundLevelUp.currentTime = 0;
        soundLevelUp.play().catch(e => console.log("Erreur audio niveau :", e));
    }

    clearInterval(spawnInterval);
    if (isGameRunning) {
        spawnInterval = setInterval(spawnItem, spawnSpeed);
    }
}

function updateHeartsDisplay() {
    if (heartsContainer) {
        heartsContainer.textContent = "❤️".repeat(lives);
    }
}

function gameLoop() {
    if (!isGameRunning) return;

    if (keys.left && chickenLeft > -75) {
        chickenLeft -= CHICKEN_SPEED;
    }
    if (keys.right && chickenLeft < 410) {
        chickenLeft += CHICKEN_SPEED;
    }
    chicken.style.left = chickenLeft + "px";

    const items = game.querySelectorAll(".item");
    const chickenRect = chicken.getBoundingClientRect();

    const chickenHitbox = {
        top: chickenRect.top + 195, 
        left: chickenRect.left + 80,    
        right: chickenRect.right - 100   
    };

    items.forEach(item => {
        let itemTop = parseFloat(item.style.top) || 0;
        itemTop += itemSpeed;
        item.style.top = itemTop + "px";

        const itemRect = item.getBoundingClientRect();

        if (
            itemRect.bottom >= chickenHitbox.top &&
            itemRect.top <= chickenRect.bottom &&
            itemRect.right >= chickenHitbox.left &&
            itemRect.left <= chickenHitbox.right
        ) {
            handleCollision(item);
        } else if (itemTop > 700) {
            if (item.dataset.value !== "fox" && item.dataset.value !== "crow" && item.dataset.value !== "weasel") {
                wormComboCount = 0; 
            }
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

    let rand = Math.random();
    let cumulativeProb = 0;
    let chosenType = types[0];

    for (let t of types) {
        cumulativeProb += t.prob;
        if (rand <= cumulativeProb) {
            chosenType = t;
            break;
        }
    }

    item.style.backgroundImage = chosenType.img;
    item.dataset.value = chosenType.val;

    const randomLeft = Math.floor(Math.random() * 452);
    item.style.left = randomLeft + "px";
    item.style.top = "-48px";

    game.appendChild(item);
}

function handleCollision(item) {
    const value = item.dataset.value;
    let textEffect = "";
    let effectClass = "";
    
    // Détection stricte des types via l'image de fond
    const bgImg = item.style.backgroundImage || "";
    const isWorm = bgImg.includes("worm.png");
    const isInsect = bgImg.includes("worm.png") || bgImg.includes("bug.png") || bgImg.includes("grasshopper.png");

    if (value === "fox") {
        lives--;
        updateHeartsDisplay();
        textEffect = "-1 Vie !";
        effectClass = "life-lost";
        wormComboCount = 0;
        
        // 🦊 Son exclusif dédié au renard
        soundFoxHit.currentTime = 0;
        soundFoxHit.play().catch(e => console.log(e));

        if (lives <= 0) endGame("vies_perdues"); 
    } else {
        const points = parseInt(value);
        score += points;
        if (score < 0) score = 0;

        if (points > 0) {
            textEffect = `+${points}`;
            effectClass = "positive";
            let comboTriggered = false;

            if (isWorm) {
                wormComboCount++;
                if (wormComboCount === 3) {
                    score += 30;
                    textEffect = "COMBO VER ! +30";
                    effectClass = "positive";
                    showComboBanner();
                    
                    soundCombo.currentTime = 0;
                    soundCombo.play().catch(e => console.log(e));

                    comboTriggered = true;
                    wormComboCount = 0;
                }
            } else {
                wormComboCount = 0;
            }

            // 🐛 Bruit de repas uniquement si c'est un insecte comestible (hors combo)
            if (!comboTriggered && isInsect) {
                soundCatch.currentTime = 0;
                soundCatch.play().catch(e => console.log(e));
            }
        } else {
            // 🦅 🪵 Gestion du corbeau (crow) et de la fouine (weasel)
            textEffect = `${points}`;
            effectClass = "negative";
            wormComboCount = 0;
            
            // Bruitage identique de danger pour le corbeau et la fouine
            soundDanger.currentTime = 0;
            soundDanger.play().catch(e => console.log(e));
        }
        scoreSpan.textContent = score;
    }

    createFloatingText(textEffect, effectClass, item.style.left, item.style.top);
    item.remove();
}

function createFloatingText(text, className, left, top) {
    const txt = document.createElement("div");
    txt.classList.add("floating-text", className);
    txt.textContent = text;
    txt.style.left = left;
    txt.style.top = top;
    game.appendChild(txt);
    setTimeout(() => { txt.remove(); }, 800);
}

function showComboBanner() {
    const banner = document.createElement("div");
    banner.classList.add("combo-banner");
    banner.innerText = "BONUS 3 VERS ! +30pts";
    game.appendChild(banner);
    setTimeout(() => { banner.remove(); }, 1500);
}

function endGame(reason) {
    isGameRunning = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    clearInterval(spawnInterval);
    clearInterval(timerInterval);
    clearInterval(cloudInterval); 
    
    // On coupe proprement la musique de jeu
    soundBgm.pause();
    soundBgm.currentTime = 0;

    if (reason === "vies_perdues") {
        // On joue le jingle Game Over
        soundGameOver.currentTime = 0;
        soundGameOver.play().catch(e => console.log(e));
        
        // Dès que le jingle de Game Over est fini, on remet la musique de menu automatiquement
        soundGameOver.onended = () => {
            if (!isMuted && !isGameRunning) {
                soundMenuBgm.currentTime = 0;
                soundMenuBgm.play().catch(e => console.log("Erreur reprise fin :", e));
            }
        };
    } else {
        // Fin au chronomètre : Lancement immédiat de la musique d'ambiance
        if (!isMuted) {
            soundMenuBgm.currentTime = 0;
            soundMenuBgm.play().catch(e => console.log(e));
        }
    }

    keys.left = false;
    keys.right = false;

    if (game.contains(levelBanner)) {
        levelBanner.remove();
    }
    
    if (chicken) {
        chicken.style.display = "none"; 
    }

    const items = game.querySelectorAll(".item");
    items.forEach(item => item.remove());

    finalScoreSpan.textContent = score;
    handleHighScores(score);
    
    if (gameOverScreen) {
        gameOverScreen.classList.remove("hidden");
    }

    // 🔒 SÉCURITÉ NAVIGATEUR : Si le navigateur bloque le son automatique après le Game Over,
    // un simple clic n'importe où sur l'écran de fin forcera la musique à démarrer.
    const forceAudioOnGameOverClick = () => {
        if (!isGameRunning && !gameOverScreen.classList.contains("hidden") && !isMuted) {
            soundMenuBgm.play().catch(e => console.log(e));
        }
        gameOverScreen.removeEventListener("click", forceAudioOnGameOverClick);
    };
    gameOverScreen.addEventListener("click", forceAudioOnGameOverClick);
}

function handleHighScores(currentScore) {
    let localScores = localStorage.getItem("chickenRushScores");
    let scoresArray = localScores ? JSON.parse(localScores) : [];

    scoresArray.push(currentScore);
    scoresArray.sort((a, b) => b - a);
    scoresArray = scoresArray.slice(0, 3);

    localStorage.setItem("chickenRushScores", JSON.stringify(scoresArray));
    
    if (highScoresList) {
        highScoresList.innerHTML = "";
        scoresArray.forEach((highScore, index) => {
            const li = document.createElement("li");
            let prefix = `${index + 1}.`;
            if (index === 0) prefix = "🥇 1st";
            if (index === 1) prefix = "🥈 2nd";
            if (index === 2) prefix = "🥉 3rd";
            
            const isCurrentNewHigh = (highScore === currentScore && scoresArray.indexOf(currentScore) === index);
            const newTag = isCurrentNewHigh ? " <span style='color:#00e676; font-size:11px;'>NEW!</span>" : "";

            li.innerHTML = `<span>${prefix}${newTag}</span> <span>${highScore} pts</span>`;
            highScoresList.appendChild(li);
        });
    }
}

function generateClouds() {
    const existingClouds = game.querySelectorAll(".cloud");
    existingClouds.forEach(c => c.remove());
    for (let i = 0; i < 4; i++) {
        createSingleCloud(true);
    }
    clearInterval(cloudInterval);
    cloudInterval = setInterval(() => { createSingleCloud(false); }, 6000);
}

function createSingleCloud(randomStart) {
    if (!isGameRunning && randomStart === false) return;
    const cloud = document.createElement("div");
    cloud.classList.add("cloud");

    const width = Math.floor(Math.random() * 260) + 240; 
    const height = width * 0.4; 
    cloud.style.width = width + "px";
    cloud.style.height = height + "px";

    const topPosition = Math.random() * 320;
    cloud.style.top = topPosition + "px";

    const duration = Math.random() * 15 + 15;
    cloud.style.animation = `moveCloud ${duration}s linear infinite`;

    if (randomStart) {
        const randomDelay = Math.random() * -duration; 
        cloud.style.animationDelay = `${randomDelay}s`;
    }
    game.insertBefore(cloud, game.firstChild);
}